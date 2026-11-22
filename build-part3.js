const fs = require("fs");
const path = require("path");
const run = global.KISMET_RUN;
const allFiles = global.KISMET_ALL_FILES;
const javaDir = "android/app/src/main/java/com/kismet/app";
fs.mkdirSync(javaDir, { recursive: true });

const saverJava = [
    "package com.kismet.app;",
    "import android.Manifest; import android.content.ContentResolver; import android.content.ContentValues; import android.content.pm.PackageManager;",
    "import android.media.MediaScannerConnection; import android.net.Uri; import android.os.Build; import android.os.Environment; import android.provider.MediaStore; import android.util.Base64;",
    "import androidx.core.app.ActivityCompat; import androidx.core.content.ContextCompat;",
    "import com.getcapacitor.JSObject; import com.getcapacitor.Plugin; import com.getcapacitor.PluginCall; import com.getcapacitor.PluginMethod; import com.getcapacitor.annotation.CapacitorPlugin;",
    "import java.io.File; import java.io.FileOutputStream; import java.io.OutputStream; import java.nio.charset.StandardCharsets; import java.util.ArrayList; import java.util.List;",
    '@CapacitorPlugin(name = "KismetSaver")',
    "public class KismetSaverPlugin extends Plugin {",
    "  private boolean hasLegacyWritePerm() {",
    "    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) return true;",
    "    return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.WRITE_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;",
    "  }",
    "  private String safeName(String raw, String defExt) {",
    '    String b = (raw == null || raw.trim().isEmpty()) ? ("KISMET_" + System.currentTimeMillis() + defExt) : raw.trim();',
    '    b = b.replaceAll("[^a-zA-Z0-9._-]+", "_");',
    '    if (b.length() < 3) b = "KISMET_" + System.currentTimeMillis() + defExt;',
    '    if (!b.toLowerCase().endsWith(defExt) && !b.toLowerCase().endsWith(".jpg") && !b.toLowerCase().endsWith(".jpeg")) b = b + defExt;',
    "    return b;",
    "  }",
    "  @PluginMethod public void requestMediaPermission(PluginCall call) {",
    "    List<String> m = new ArrayList<>();",
    "    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {",
    "      if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.READ_MEDIA_IMAGES) != PackageManager.PERMISSION_GRANTED) m.add(Manifest.permission.READ_MEDIA_IMAGES);",
    "      if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) m.add(Manifest.permission.POST_NOTIFICATIONS);",
    "    } else if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {",
    "      if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) m.add(Manifest.permission.WRITE_EXTERNAL_STORAGE);",
    "    }",
    "    if (!m.isEmpty() && getActivity() != null) ActivityCompat.requestPermissions(getActivity(), m.toArray(new String[0]), 9042);",
    '    JSObject r = new JSObject(); r.put("granted", m.isEmpty()); call.resolve(r);',
    "  }",
    "  @PluginMethod public void saveImage(PluginCall call) {",
    '    String b64 = call.getString("base64"); String fn = safeName(call.getString("filename"), ".png");',
    '    if (b64 == null || b64.isEmpty()) { call.reject("Empty image"); return; }',
    "    if (!hasLegacyWritePerm()) {",
    "      if (getActivity() != null) ActivityCompat.requestPermissions(getActivity(), new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, 9042);",
    '      call.reject("Storage Permission ကို Allow နှိပ်ပြီး ထပ်သိမ်းပါ"); return;',
    "    }",
    "    try {",
    '      String mime = "image/png";',
    '      if (b64.contains(",")) { String h = b64.substring(0, b64.indexOf(",")).toLowerCase(); if (h.contains("jpeg") || h.contains("jpg")) mime = "image/jpeg"; b64 = b64.substring(b64.indexOf(",") + 1); }',
    "      byte[] bytes = Base64.decode(b64, Base64.DEFAULT); long now = System.currentTimeMillis();",
    "      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {",
    "        ContentValues v = new ContentValues(); v.put(MediaStore.Images.Media.DISPLAY_NAME, fn); v.put(MediaStore.Images.Media.MIME_TYPE, mime);",
    '        v.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/KISMET");',
    "        v.put(MediaStore.Images.Media.DATE_TAKEN, now); v.put(MediaStore.Images.Media.DATE_ADDED, now / 1000); v.put(MediaStore.Images.Media.IS_PENDING, 1);",
    "        ContentResolver r = getContext().getContentResolver(); Uri u = r.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, v);",
    '        if (u == null) { call.reject("Gallery insert failed"); return; }',
    '        try (OutputStream o = r.openOutputStream(u)) { if (o == null) throw new Exception("Null stream"); o.write(bytes); o.flush(); }',
    "        v.clear(); v.put(MediaStore.Images.Media.IS_PENDING, 0); r.update(u, v, null, null);",
    "      } else {",
    '        File d = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), "KISMET"); if (!d.exists()) d.mkdirs();',
    "        File f = new File(d, fn); try (FileOutputStream fos = new FileOutputStream(f)) { fos.write(bytes); fos.flush(); }",
    "        MediaScannerConnection.scanFile(getContext(), new String[]{f.getAbsolutePath()}, new String[]{mime}, null);",
    "      }",
    '      JSObject ret = new JSObject(); ret.put("saved", true); ret.put("filename", fn); call.resolve(ret);',
    "    } catch (Exception e) { call.reject(e.getMessage()); }",
    "  }",
    "  @PluginMethod public void saveFile(PluginCall call) {",
    '    String tx = call.getString("text"); String fn = safeName(call.getString("filename"), ".csv"); String mm = call.getString("mime", "text/csv");',
    '    if (tx == null) { call.reject("Empty file"); return; }',
    "    if (!hasLegacyWritePerm()) {",
    "      if (getActivity() != null) ActivityCompat.requestPermissions(getActivity(), new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, 9042);",
    '      call.reject("Storage Permission ကို Allow နှိပ်ပြီး ထပ်သိမ်းပါ"); return;',
    "    }",
    "    try {",
    "      byte[] bytes = tx.getBytes(StandardCharsets.UTF_8);",
    "      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {",
    "        ContentValues v = new ContentValues(); v.put(MediaStore.Downloads.DISPLAY_NAME, fn); v.put(MediaStore.Downloads.MIME_TYPE, mm);",
    '        v.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/KISMET"); v.put(MediaStore.Downloads.IS_PENDING, 1);',
    "        ContentResolver r = getContext().getContentResolver(); Uri u = r.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);",
    '        if (u == null) { call.reject("Download insert failed"); return; }',
    '        try (OutputStream o = r.openOutputStream(u)) { if (o == null) throw new Exception("Null stream"); o.write(bytes); o.flush(); }',
    "        v.clear(); v.put(MediaStore.Downloads.IS_PENDING, 0); r.update(u, v, null, null);",
    "      } else {",
    '        File d = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "KISMET"); if (!d.exists()) d.mkdirs();',
    "        File f = new File(d, fn); try (FileOutputStream fos = new FileOutputStream(f)) { fos.write(bytes); fos.flush(); }",
    "      }",
    '      JSObject ret = new JSObject(); ret.put("saved", true); call.resolve(ret);',
    "    } catch (Exception e) { call.reject(e.getMessage()); }",
    "  }",
    "}"
].join("\n");

fs.writeFileSync(path.join(javaDir, "KismetSaverPlugin.java"), saverJava, "utf8");
fs.writeFileSync(path.join(javaDir, "MainActivity.java"), [
    "package com.kismet.app; import android.os.Bundle; import com.getcapacitor.BridgeActivity;",
    "public class MainActivity extends BridgeActivity { @Override public void onCreate(Bundle s) { registerPlugin(KismetSaverPlugin.class); super.onCreate(s); } }"
].join("\n"), "utf8");

global.KISMET_PART3B = () => {
    const mp = "android/app/src/main/AndroidManifest.xml";
    let xml = fs.readFileSync(mp, "utf8");
    const perms = [
        '<uses-permission android:name="android.permission.VIBRATE" />',
        '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />',
        '<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />',
        '<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />',
        '<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />'
    ].join("\n");
    xml = xml.replace('<uses-permission android:name="android.permission.INTERNET" />', '<uses-permission android:name="android.permission.INTERNET" />\n' + perms);
    fs.writeFileSync(mp, xml, "utf8");

    const iconFile = fs.existsSync("1000532061.jpg") ? "1000532061.jpg" : allFiles.find(f => /\.(jpg|jpeg)$/i.test(f));
    if (iconFile) {
        run("sudo apt-get update -qq && sudo apt-get install -y -qq imagemagick");
        fs.rmSync("android/app/src/main/res/mipmap-anydpi-v26", { recursive: true, force: true });
        [["mdpi", 48], ["hdpi", 72], ["xhdpi", 96], ["xxhdpi", 144], ["xxxhdpi", 192]].forEach(([dir, size]) => {
            const out = `android/app/src/main/res/mipmap-${dir}/ic_launcher.png`;
            run(`convert "${iconFile}" -resize "${size}x${size}^" -gravity center -extent "${size}x${size}" "${out}"`);
            fs.copyFileSync(out, `android/app/src/main/res/mipmap-${dir}/ic_launcher_round.png`);
        });
    }
    run("chmod +x gradlew && ./gradlew assembleDebug", "android");
    fs.copyFileSync("android/app/build/outputs/apk/debug/app-debug.apk", "KISMET.apk");
};
