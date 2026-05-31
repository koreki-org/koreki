import { create, all } from 'mathjs';
const math = create(all);
math.import({
  ifelse: (condition: any, trueVal: any, falseVal: any) => condition ? trueVal : falseVal
});
const scope = { subnetA_netid: '192.168.1.0' };

function replaceTernary(expr: string): string {
  if (expr.includes('?')) {
     const parts = expr.split('?');
     if (parts.length === 2) {
       const condition = parts[0].trim();
       const branches = parts[1].split(':');
       if (branches.length >= 2) {
         // Join the rest in case there are other colons (e.g. in strings)
         // Wait, IPs have no colons, but IPv6 does!
         const trueBranch = branches[0].trim();
         const falseBranch = branches.slice(1).join(':').trim();
         return `ifelse(${condition}, ${trueBranch}, ${falseBranch})`;
       }
     }
  }
  return expr;
}

try {
  let expr = "subnetA_netid == '192.168.1.0' ? '192.168.1.32' : '192.168.1.0'";
  expr = replaceTernary(expr);
  console.log("Transformed:", expr);
  console.log("Result:", math.evaluate(expr, scope));
} catch (e: any) {
  console.error("Error:", e.message);
}
