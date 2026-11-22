const fs = require("fs");
const path = require("path");
const run = global.KISMET_RUN;
const allFiles = global.KISMET_ALL_FILES;

fs.mkdirSync("www/fa", { recursive: true });
fs.mkdirSync("www/vendor", { recursive: true });

const mainHtml = fs.existsSync("KISMET_gate_v8.html")
    ? "KISMET_gate_v8.html"
    : allFiles.find(f => f.endsWith(".html") && !f.startsWith("kismet-addon"));
if (!mainHtml) throw new Error("Main HTML not found!");
fs.copyFileSync(mainHtml, "www/index.html");

allFiles.forEach(f => {
    if (/\.(png|jpg|jpeg)$/i.test(f)) fs.copyFileSync(f, path.join("www", f));
});

run("npm init -y");
run("npm install @capacitor/core@6 @capacitor/cli@6 @capacitor/android@6 @capacitor/local-notifications@6 @capacitor/haptics@6 @fortawesome/fontawesome-free@6 html2canvas@1.4.1");

fs.cpSync("node_modules/@fortawesome/fontawesome-free/css", "www/fa/css", { recursive: true });
fs.cpSync("node_modules/@fortawesome/fontawesome-free/webfonts", "www/fa/webfonts", { recursive: true });
fs.copyFileSync("node_modules/html2canvas/dist/html2canvas.min.js", "www/vendor/html2canvas.min.js");

let html = fs.readFileSync("www/index.html", "utf8");
html = html.replace(/https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome\/6\.4\.0\/css\/all\.min\.css/g, "./fa/css/all.min.css");
html = html.replace(/https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/html2canvas\/1\.4\.1\/html2canvas\.min\.js/g, "./vendor/html2canvas.min.js");

let addons = "";
["kismet-addon-1.html", "kismet-addon-2.html", "kismet-addon-2b.html"].forEach(f => {
    if (fs.existsSync(f)) {
        const txt = fs.readFileSync(f, "utf8");
        console.log("INJECTED ADDON:", f, "LENGTH:", txt.length);
        addons += "\n" + txt + "\n";
    } else {
        console.log("MISSING ADDON:", f);
    }
});

const idx = html.toLowerCase().lastIndexOf("</body>");
html = idx !== -1 ? (html.slice(0, idx) + addons + html.slice(idx)) : (html + addons);
fs.writeFileSync("www/index.html", html, "utf8");

run('npx cap init "KISMET" "com.kismet.app" --web-dir www');
run("npx cap add android");
run("npx cap sync android");
