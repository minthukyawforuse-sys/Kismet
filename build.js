const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function run(cmd, cwd) {
    console.log(">>> " + cmd);
    execSync(cmd, { stdio: "inherit", cwd: cwd || process.cwd() });
}

// 1. Prepare www directories & copy HTML + images
fs.mkdirSync("www/fa", { recursive: true });
fs.mkdirSync("www/vendor", { recursive: true });

const allFiles = fs.readdirSync(".");
let mainHtml = null;
if (fs.existsSync("KISMET_gate_v8.html")) {
    mainHtml = "KISMET_gate_v8.html";
} else if (fs.existsSync("index.html")) {
    mainHtml = "index.html";
} else {
    mainHtml = allFiles.find(f => f.endsWith(".html") && !f.startsWith("kismet-addon"));
}
if (!mainHtml) {
    throw new Error("Main HTML file not found!");
}
fs.copyFileSync(mainHtml, "www/index.html");

allFiles.forEach(f => {
    if (/\.(png|jpg|jpeg)$/i.test(f)) {
        fs.copyFileSync(f, path.join("www", f));
    }
});

// 2. Install Capacitor, Native Plugins, Offline Icons & html2canvas
run("npm init -y");
run("npm install @capacitor/core@6 @capacitor/cli@6 @capacitor/android@6 @capacitor/local-notifications@6 @capacitor/haptics@6 @fortawesome/fontawesome-free@6 html2canvas@1.4.1");

fs.cpSync("node_modules/@fortawesome/fontawesome-free/css", "www/fa/css", { recursive: true });
fs.cpSync("node_modules/@fortawesome/fontawesome-free/webfonts", "www/fa/webfonts", { recursive: true });
fs.copyFileSync("node_modules/html2canvas/dist/html2canvas.min.js", "www/vendor/html2canvas.min.js");

// 3. Patch index.html for offline assets & inject addons
const cleanAddon = (txt) => txt.replace(/^\s*```[a-zA-Z]*\s*$/gm, "");
let html = fs.readFileSync("www/index.html", "utf8");
html = html.replace(/https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome\/6\.4\.0\/css\/all\.min\.css/g, "./fa/css/all.min.css");
html = html.replace(/https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/html2canvas\/1\.4\.1\/html2canvas\.min\.js/g, "./vendor/html2canvas.min.js");

if (!fs.existsSync("1000533185.png")) {
    html = html.replace(
        '<img src="1000533185.png" alt="KISMET" class="h-6 object-contain inline-block">',
        '<span class="text-base font-extrabold tracking-widest text-white">KISMET</span>'
    );
}

if (fs.existsSync("kismet-addon-1.html") || fs.existsSync("kismet-addon-2.html")) {
    ["kismet-addon-1.html", "kismet-addon-2.html"].forEach(f => {
        if (fs.existsSync(f)) {
            html = html.replace(/<\/body>/i, "\n" + cleanAddon(fs.readFileSync(f, "utf8")) + "\n</body>");
        }
    });
} else if (fs.existsSync("kismet-addons.html")) {
    html = html.replace(/<\/body>/i, "\n" + cleanAddon(fs.readFileSync("kismet-addons.html", "utf8")) + "\n</body>");
}
fs.writeFileSync("www/index.html", html, "utf8");

// 4. Initialize Capacitor Android Project
run('npx cap init "KISMET" "com.kismet.app" --web-dir www');
run("npx cap add android");
run("npx cap sync android");

// 5. Add Native Android Gallery & CSV Saver Plugin
const javaDir = "android/app/src/main/java/com/kismet/app";
fs.mkdirSync(javaDir, { recursive: true });

const saverJava = [
    "package com.kismet.app;",
    "import android.content.ContentResolver;",
    "import android.content.ContentValues;",
    "import android.media.MediaScannerConnection;",
    "import android.net.Uri;",
    "import android.os.Build;",
    "import android.os.Environment;",
    "import android.provider.MediaStore;",
    "import android.util.Base64;",
    "import com.getcapacitor.JSObject;",
    "import com.getcapacitor.Plugin;",
    "import com.getcapacitor.PluginCall;",
    "import com.getcapacitor.PluginMethod;",
    "import com.getcapacitor.annotation.CapacitorPlugin;",
    "import java.io.File;",
    "import java.io.FileOutputStream;",
    "import java.io.OutputStream;",
    "import java.nio.charset.StandardCharsets;",
    '@CapacitorPlugin(name = "KismetSaver")',
    "public class KismetSaverPlugin extends Plugin {",
    "  @PluginMethod",
    "  public void saveImage(PluginCall call) {",
    '    String base64 = call.getString("base64");',
    '    String filename = call.getString("filename", "KISMET_" + System.currentTimeMillis() + ".png");',
    '    if (base64 == null || base64.isEmpty()) { call.reject("Empty image"); return; }',
    "    try {",
    '      if (base64.contains(",")) base64 = base64.substring(base64.indexOf(",") + 1);',
    "      byte[] bytes = Base64.decode(base64, Base64.DEFAULT);",
    "      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {",
    "        ContentValues values = new ContentValues();",
    "        values.put(MediaStore.Images.Media.DISPLAY_NAME, filename);",
    '        values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");',
    '        values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/KISMET");',
    "        values.put(MediaStore.Images.Media.IS_PENDING, 1);",
    "        ContentResolver resolver = getContext().getContentResolver();",
    "        Uri uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);",
    '        if (uri == null) { call.reject("Cannot create gallery entry"); return; }',
    "        try (OutputStream out = resolver.openOutputStream(uri)) {",
    '          if (out == null) throw new Exception("OutputStream is null");',
    "          out.write(bytes);",
    "        }",
    "        values.clear();",
    "        values.put(MediaStore.Images.Media.IS_PENDING, 0);",
    "        resolver.update(uri, values, null, null);",
    "      } else {",
    '        File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), "KISMET");',
    "        if (!dir.exists()) dir.mkdirs();",
    "        File file = new File(dir, filename);",
    "        try (FileOutputStream fos = new FileOutputStream(file)) { fos.write(bytes); }",
    '        MediaScannerConnection.scanFile(getContext(), new String[]{file.getAbsolutePath()}, new String[]{"image/png"}, null);',
    "      }",
    '      JSObject ret = new JSObject(); ret.put("saved", true); call.resolve(ret);',
    "    } catch (Exception e) { call.reject(e.getMessage()); }",
    "  }",
    "  @PluginMethod",
    "  public void saveFile(PluginCall call) {",
    '    String text = call.getString("text");',
    '    String filename = call.getString("filename", "KISMET_" + System.currentTimeMillis() + ".csv");',
    '    String mime = call.getString("mime", "text/csv");',
    '    if (text == null) { call.reject("Empty file"); return; }',
    "    try {",
    "      byte[] bytes = text.getBytes(StandardCharsets.UTF_8);",
    "      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {",
    "        ContentValues values = new ContentValues();",
    "        values.put(MediaStore.Downloads.DISPLAY_NAME, filename);",
    "        values.put(MediaStore.Downloads.MIME_TYPE, mime);",
    '        values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/KISMET");',
    "        values.put(MediaStore.Downloads.IS_PENDING, 1);",
    "        ContentResolver resolver = getContext().getContentResolver();",
    "        Uri uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);",
    '        if (uri == null) { call.reject("Cannot create download entry"); return; }',
    "        try (OutputStream out = resolver.openOutputStream(uri)) {",
    '          if (out == null) throw new Exception("OutputStream is null");',
    "          out.write(bytes);",
    "        }",
    "        values.clear();",
    "        values.put(MediaStore.Downloads.IS_PENDING, 0);",
    "        resolver.update(uri, values, null, null);",
    "      } else {",
    '        File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "KISMET");',
    "        if (!dir.exists()) dir.mkdirs();",
    "        File file = new File(dir, filename);",
    "        try (FileOutputStream fos = new FileOutputStream(file)) { fos.write(bytes); }",
    "      }",
    '      JSObject ret = new JSObject(); ret.put("saved", true); call.resolve(ret);',
    "    } catch (Exception e) { call.reject(e.getMessage()); }",
    "  }",
    "}"
].join("\n");

const mainActivityJava = [
    "package com.kismet.app;",
    "import android.os.Bundle;",
    "import com.getcapacitor.BridgeActivity;",
    "public class MainActivity extends BridgeActivity {",
    "  @Override",
    "  public void onCreate(Bundle savedInstanceState) {",
    "    registerPlugin(KismetSaverPlugin.class);",
    "    super.onCreate(savedInstanceState);",
    "  }",
    "}"
].join("\n");

fs.writeFileSync(path.join(javaDir, "KismetSaverPlugin.java"), saverJava, "utf8");
fs.writeFileSync(path.join(javaDir, "MainActivity.java"), mainActivityJava, "utf8");

// 6. Add Android Permissions
const manifestPath = "android/app/src/main/AndroidManifest.xml";
let xml = fs.readFileSync(manifestPath, "utf8");
const perms = [
    '<uses-permission android:name="android.permission.VIBRATE" />',
    '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />',
    '<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />'
].join("\n");
xml = xml.replace(
    '<uses-permission android:name="android.permission.INTERNET" />',
    '<uses-permission android:name="android.permission.INTERNET" />\n' + perms
);
fs.writeFileSync(manifestPath, xml, "utf8");

// 7. Set App Icon
let iconFile = fs.existsSync("1000532061.jpg")
    ? "1000532061.jpg"
    : allFiles.find(f => /\.(jpg|jpeg)$/i.test(f));

if (iconFile) {
    run("sudo apt-get update -qq && sudo apt-get install -y -qq imagemagick");
    fs.rmSync("android/app/src/main/res/mipmap-anydpi-v26", { recursive: true, force: true });
    const specs = [["mdpi", 48], ["hdpi", 72], ["xhdpi", 96], ["xxhdpi", 144], ["xxxhdpi", 192]];
    specs.forEach(([dir, size]) => {
        const out = `android/app/src/main/res/mipmap-${dir}/ic_launcher.png`;
        const outRound = `android/app/src/main/res/mipmap-${dir}/ic_launcher_round.png`;
        run(`convert "${iconFile}" -resize "${size}x${size}^" -gravity center -extent "${size}x${size}" "${out}"`);
        fs.copyFileSync(out, outRound);
    });
}

// 8. Build Debug APK
run("chmod +x gradlew && ./gradlew assembleDebug", "android");
fs.copyFileSync("android/app/build/outputs/apk/debug/app-debug.apk", "KISMET.apk");
console.log("SUCCESS: KISMET.apk built!");
