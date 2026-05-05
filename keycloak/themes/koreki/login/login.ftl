<#import "template.ftl" as layout>
<@layout.registrationLayout displayInfo=social.displayInfo; section>
    <#if section = "header">
        <#-- We leave this empty and put our branding into the form section to avoid being hidden by base theme CSS -->
    <#elseif section = "form">
        <div class="koreki-branding-container">
            <img src="${url.resourcesPath}/img/logo.png" alt="" class="koreki-symbol" />
            <div class="koreki-text">Koreki<span class="dot">.</span></div>
        </div>
        <div class="koreki-tagline">Dein KI-Korrektur Assistent</div>

        <div id="kc-form">
            <div id="kc-form-wrapper">
                <#if realm.password>
                    <form id="kc-form-login" onsubmit="login.disabled = true; return true;" action="${url.loginAction}" method="post">
                        <div class="form-group">
                            <label for="username"><#if !realm.loginWithEmailAllowed>${msg("username")}<#elseif !realm.registrationAllowed>${msg("usernameOrEmail")}<#else>${msg("email")}</#if></label>
                            <input tabindex="1" id="username" class="form-control" name="username" value="${(login.username!'')}" type="text" autofocus autocomplete="off" />
                        </div>

                        <div class="form-group">
                            <label for="password">${msg("password")}</label>
                            <input tabindex="2" id="password" class="form-control" name="password" type="password" autocomplete="off" />
                        </div>

                        <div class="form-options">
                            <#if realm.resetPasswordAllowed>
                                <span><a tabindex="5" href="${url.loginResetCredentialsUrl}">${msg("doForgotPassword")}</a></span>
                            </#if>
                        </div>

                        <div id="kc-form-buttons">
                            <input tabindex="4" class="btn-primary" name="login" id="kc-login" type="submit" value="${msg("doLogIn")}"/>
                        </div>
                    </form>
                </#if>
            </div>
        </div>
    </#if>
</@layout.registrationLayout>
