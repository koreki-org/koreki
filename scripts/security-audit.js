const { execSync } = require('child_process');

console.log('Running npm audit --json...');
try {
    execSync('npm audit --audit-level=high --json', { stdio: 'pipe' });
    console.log('✅ Audit passed. No high/critical vulnerabilities found.');
    process.exit(0);
} catch (error) {
    if (error.stdout) {
        const output = JSON.parse(error.stdout.toString());
        const vulns = output.vulnerabilities || {};
        
        // Allowed vulnerabilities that we have mitigated locally or are dev-tooling only
        const allowedPackages = [
            'expr-eval',        // Mitigated via regex guard in plugins.ts
            'brace-expansion',  // Dev tooling only (ESLint/TS parser, no runtime impact)
            'js-yaml'           // Dev tooling only (ESLint config parser, no runtime impact)
        ];

        let hasBlocker = false;

        for (const [pkgName, vuln] of Object.entries(vulns)) {
            if (vuln.severity === 'high' || vuln.severity === 'critical') {
                if (allowedPackages.includes(pkgName)) {
                    console.log(`⚠️  Ignoring mitigated vulnerability in '${pkgName}' (${vuln.severity})`);
                } else {
                    console.error(`🚨 Unmitigated vulnerability found in '${pkgName}' (${vuln.severity})`);
                    hasBlocker = true;
                }
            }
        }

        if (hasBlocker) {
            console.error('\n❌ Security Audit failed due to unmitigated high/critical vulnerabilities.');
            process.exit(1);
        } else {
            console.log('\n✅ Security Audit passed (known vulnerabilities are mitigated).');
            process.exit(0);
        }
    } else {
        console.error('Audit failed to execute properly:', error);
        process.exit(1);
    }
}
