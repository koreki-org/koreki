use serde::{Deserialize, Serialize};
use futures_util::StreamExt;
use tauri::Emitter;
use keyring::Entry;

#[derive(Serialize, Deserialize, Clone)]
struct OllamaOptions {
    #[serde(skip_serializing_if = "Option::is_none")]
    num_ctx: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    top_p: Option<f32>,
}

#[derive(Serialize, Deserialize, Clone)]
struct OllamaMessage {
    role: Option<String>,
    content: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    thinking: Option<String>, // Support for Reasoning Models (e.g. Gemma 2/3, DeepSeek R1)
    #[serde(skip_serializing_if = "Option::is_none")]
    images: Option<Vec<String>>,
}

#[derive(Serialize, Deserialize)]
struct OllamaChatRequest {
    model: String,
    messages: Vec<OllamaMessage>,
    stream: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    format: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    options: Option<OllamaOptions>,
}

#[derive(Deserialize, Serialize)]
struct OllamaChatResponseChunk {
    message: Option<OllamaMessage>,
    done: bool,
}

#[derive(Deserialize, Serialize)]
struct OllamaModel {
    name: String,
}

#[derive(Deserialize, Serialize)]
struct OllamaTagsResponse {
    models: Vec<OllamaModel>,
}

#[derive(Serialize)]
struct PingResponse {
    success: bool,
    is_self_signed: bool,
    version: String,
}

#[derive(Serialize)]
struct ModelsResponse {
    models: Vec<String>,
    is_self_signed: bool,
    version: String,
}


async fn fetch_with_ssl_failover(url: &str) -> Result<(reqwest::Response, bool), String> {
    let client_strict = reqwest::Client::builder()
        .danger_accept_invalid_certs(false)
        .build()
        .map_err(|e| format!("Client error: {}", e))?;

    let res = client_strict.get(url).send().await;

    match res {
        Ok(response) => Ok((response, false)),
        Err(e) if url.starts_with("https") => {
            // Potential SSL issue, try with danger mode
            let client_danger = reqwest::Client::builder()
                .danger_accept_invalid_certs(true)
                .build()
                .map_err(|e| format!("Client error: {}", e))?;
            
            let res_danger = client_danger.get(url).send().await;
            match res_danger {
                Ok(response) => Ok((response, true)),
                Err(_) => Err(format!("Connection failed: {}", e)),
            }
        },
        Err(e) => Err(format!("Connection failed: {}", e)),
    }
}

#[tauri::command]
async fn ping_ollama_command(url: String) -> Result<PingResponse, String> {
    let clean_url = url.trim_end_matches('/');
    let target_tags = format!("{}/api/tags", clean_url);
    let target_version = format!("{}/api/version", clean_url);
    
    match fetch_with_ssl_failover(&target_tags).await {
        Ok((res, is_self_signed)) => {
            let success = res.status().is_success();
            let mut version = String::from("unknown");
            
            if success {
                // Try to get version as well
                if let Ok((v_res, _)) = fetch_with_ssl_failover(&target_version).await {
                    if let Ok(v_json) = v_res.json::<serde_json::Value>().await {
                        if let Some(v) = v_json.get("version").and_then(|v| v.as_str()) {
                            version = v.to_string();
                        }
                    }
                }
            }
            
            Ok(PingResponse { 
                success, 
                is_self_signed,
                version
            })
        },
        Err(_) => Ok(PingResponse { success: false, is_self_signed: false, version: "".into() }),
    }
}

#[tauri::command]
async fn get_ollama_models_command(url: String) -> Result<ModelsResponse, String> {
    let clean_url = url.trim_end_matches('/');
    let target_tags = format!("{}/api/tags", clean_url);
    let target_version = format!("{}/api/version", clean_url);

    let (res, is_self_signed) = fetch_with_ssl_failover(&target_tags).await
        .map_err(|e| format!("Ollama unreachable: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("Ollama error: {}", res.status()));
    }

    let tags_json: serde_json::Value = res.json().await.map_err(|e| format!("JSON error: {}", e))?;
    
    let mut model_names = Vec::new();
    if let Some(models) = tags_json.get("models").and_then(|m| m.as_array()) {
        for m in models {
            if let Some(name) = m.get("name").and_then(|n| n.as_str()) {
                model_names.push(name.to_string());
            }
        }
    }

    let mut version = String::from("unknown");
    if let Ok((v_res, _)) = fetch_with_ssl_failover(&target_version).await {
        if let Ok(v_json) = v_res.json::<serde_json::Value>().await {
            if let Some(v) = v_json.get("version").and_then(|v| v.as_str()) {
                version = v.to_string();
            }
        }
    }

    Ok(ModelsResponse {
        models: model_names,
        is_self_signed,
        version
    })
}

#[tauri::command]
async fn execute_ollama_command(
    app: tauri::AppHandle,
    url: String,
    model: String,
    prompt: String,
    request_id: String, // Industrial Scoping: Unique ID per task
    stream: bool, // Toggle for streaming vs batch mode
    system: Option<String>,
    images: Option<Vec<String>>,
    format: Option<String>,
    num_ctx: Option<u32>,
    temperature: Option<f32>,
    top_p: Option<f32>,
) -> Result<String, String> {
    let mut messages = Vec::new();
    if let Some(sys_content) = system {
        messages.push(OllamaMessage { role: Some("system".into()), content: Some(sys_content), thinking: None, images: None });
    }
    messages.push(OllamaMessage { role: Some("user".into()), content: Some(prompt), thinking: None, images });


    let request_payload = OllamaChatRequest {
        model,
        messages,
        stream,
        format,
        options: Some(OllamaOptions { 
            num_ctx,
            temperature,
            top_p,
        }),
    };


    let clean_url = url.trim_end_matches('/');
    let target_url = format!("{}/api/chat", clean_url);
    let body_json = serde_json::to_string(&request_payload).map_err(|e| format!("Serialization error: {}", e))?;

    // Use SSL failover for the main execution as well
    let client_strict = reqwest::Client::builder().danger_accept_invalid_certs(false).build().unwrap();
    let res_attempt = client_strict.post(&target_url)
        .header("Content-Type", "application/json")
        .body(body_json.clone())
        .send()
        .await;

    let res = match res_attempt {
        Ok(r) => r,
        Err(_e) if url.starts_with("https") => {
            let client_danger = reqwest::Client::builder().danger_accept_invalid_certs(true).build().unwrap();
            client_danger.post(&target_url)
                .header("Content-Type", "application/json")
                .body(body_json)
                .send()
                .await
                .map_err(|e| format!("Request failed: {}", e))?
        },
        Err(e) => return Err(format!("Request failed: {}", e)),
    };

    // Industrial Error Propagation: Check for HTTP failure (404, 500, etc)
    if !res.status().is_success() {
        let status = res.status();
        let error_text = res.text().await.unwrap_or_else(|_| "Unknown error body".into());
        return Err(format!("Ollama HTTP Error {}: {}", status, error_text));
    }


    let mut stream = res.bytes_stream();
    let mut full_response = String::new();
    let mut buffer = Vec::new();
    
    // Scoped event name to prevent cross-talk in multi-batch processing
    let event_name = format!("ollama-token-{}", request_id);

    while let Some(chunk_result) = stream.next().await {
        let chunk_bytes = chunk_result.map_err(|e| format!("Stream error: {}", e))?;
        buffer.extend_from_slice(&chunk_bytes);

        // Industrial Stream Hardening: Process only full lines from the accumulator
        while let Some(pos) = buffer.iter().position(|&b| b == b'\n') {
            let line_bytes = buffer.drain(..pos + 1).collect::<Vec<u8>>();
            let line_str = String::from_utf8_lossy(&line_bytes);
            let line = line_str.trim();

            if line.is_empty() { continue; }

            // ARCH: Pure Proxy - Just emit the raw line
            let _ = app.emit(&event_name, line);
            
            // Build full response for the non-streaming return
            if let Ok(json_chunk) = serde_json::from_str::<OllamaChatResponseChunk>(line) {
                if let Some(msg) = json_chunk.message {
                    if let Some(content) = msg.content {
                        full_response.push_str(&content);
                    }
                }
            }
        }
    }

    // FINAL DRAIN: Ensure the last partial chunk is emitted/processed
    if !buffer.is_empty() {
        let line_str = String::from_utf8_lossy(&buffer);
        let line = line_str.trim();
        if !line.is_empty() {
            let _ = app.emit(&event_name, line);
            if let Ok(json_chunk) = serde_json::from_str::<OllamaChatResponseChunk>(line) {
                if let Some(msg) = json_chunk.message {
                    if let Some(content) = msg.content {
                        full_response.push_str(&content);
                    }
                }
            }
        }
    }

    Ok(full_response)
}





use std::fs::File;
use std::io::Write;

#[derive(Serialize, Deserialize)]
struct NativeFile {
    name: String,
    data: Vec<u8>,
}

#[tauri::command]
async fn save_file_native(data: Vec<u8>, filename: String) -> Result<bool, String> {
    let dialog = rfd::AsyncFileDialog::new()
        .set_file_name(&filename)
        .save_file();

    if let Some(file_handle) = dialog.await {
        let path = file_handle.path();
        let mut file = File::create(path).map_err(|e| format!("Failed to create file: {}", e))?;
        file.write_all(&data).map_err(|e| format!("Failed to write data: {}", e))?;
        Ok(true)
    } else {
        Ok(false)
    }
}

#[tauri::command]
async fn open_file_native(multiple: bool, filters: Vec<String>) -> Result<Vec<NativeFile>, String> {
    let mut dialog = rfd::AsyncFileDialog::new();
    
    // Add filters if provided (e.g. ["pdf", "koreki"])
    if !filters.is_empty() {
        let filter_refs: Vec<&str> = filters.iter().map(|s| s.as_str()).collect();
        dialog = dialog.add_filter("Allowed Files", &filter_refs);
    }

    let result = if multiple {
        dialog.pick_files().await.map(|handles| {
            handles.into_iter().map(|h| h).collect::<Vec<_>>()
        })
    } else {
        dialog.pick_file().await.map(|h| vec![h])
    };

    if let Some(handles) = result {
        let mut files = Vec::new();
        for handle in handles {
            let name = handle.file_name();
            let data = handle.read().await;
            files.push(NativeFile { name, data });
        }
        Ok(files)
    } else {
        Ok(Vec::new())
    }
}

#[tauri::command]
async fn execute_ai_proxy_command(
    url: String,
    method: String,
    headers: std::collections::HashMap<String, String>,
    body: String,
) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .danger_accept_invalid_certs(true) // Be lenient for internal/custom endpoints in Desktop mode
        .build()
        .map_err(|e| format!("Client error: {}", e))?;

    let mut request = match method.to_uppercase().as_str() {
        "POST" => client.post(&url),
        "GET" => client.get(&url),
        _ => return Err(format!("Unsupported method: {}", method)),
    };

    for (k, v) in headers {
        request = request.header(k, v);
    }

    let res = request.body(body).send().await
        .map_err(|e| format!("Proxy request failed: {}", e))?;

    if !res.status().is_success() {
        let status = res.status();
        let text = res.text().await.unwrap_or_else(|_| "Error body unreadable".into());
        return Err(format!("Proxy HTTP {}: {}", status, text));
    }

    Ok(res.text().await.map_err(|e| format!("Response text error: {}", e))?)
}

#[tauri::command]
async fn save_secret(key: String, value: String) -> Result<(), String> {
    let entry = Entry::new("koreki-app", &key).map_err(|e| format!("Vault error: {}", e))?;
    entry.set_password(&value).map_err(|e| format!("Failed to save to vault: {}", e))?;
    Ok(())
}

#[tauri::command]
async fn get_secret(key: String) -> Result<String, String> {
    let entry = Entry::new("koreki-app", &key).map_err(|e| format!("Vault error: {}", e))?;
    match entry.get_password() {
        Ok(pw) => Ok(pw),
        Err(keyring::Error::NoEntry) => Ok("".to_string()),
        Err(e) => Err(format!("Vault retrieval error: {}", e)),
    }
}

#[tauri::command]
async fn delete_secret(key: String) -> Result<(), String> {
    let entry = Entry::new("koreki-app", &key).map_err(|e| format!("Vault error: {}", e))?;
    // Ignore error if entry doesn't exist
    let _ = entry.delete_password();
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_log::Builder::default().build())
    .plugin(tauri_plugin_shell::init())
    .invoke_handler(tauri::generate_handler![
        ping_ollama_command,
        get_ollama_models_command,
        execute_ollama_command,
        execute_ai_proxy_command,
        save_file_native,
        open_file_native,
        save_secret,
        get_secret,
        delete_secret
    ])
    .setup(|_app| {
      if cfg!(debug_assertions) {
        // Log setup already handled by plugin
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_native_vault_flow() {
        let test_key = "test-mistral-key-12345".to_string();
        let test_val = "sk-secret-test-value-for-industrial-validation".to_string();

        let save_res = save_secret(test_key.clone(), test_val.clone()).await;
        assert!(save_res.is_ok(), "Failed to save secret to OS vault");

        let get_res = get_secret(test_key.clone()).await;
        assert!(get_res.is_ok(), "Failed to read secret from OS vault");
        assert_eq!(get_res.unwrap(), test_val, "Value mismatch in OS vault");

        let del_res = delete_secret(test_key.clone()).await;
        assert!(del_res.is_ok(), "Failed to delete secret from OS vault");

        let get_res_after = get_secret(test_key.clone()).await;
        assert!(get_res_after.is_ok(), "Reading deleted secret should return empty string, not fail");
        assert_eq!(get_res_after.unwrap(), "", "Deleted secret should be empty string");
    }
}
