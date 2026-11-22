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
    "  private String[] neededMediaPerms() {",
    "    List<String> list = new ArrayList<>();",
    "    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) { list.add(Manifest.permission.READ_MEDIA_IMAGES); list.add(Manifest.permission.POST_NOTIFICATIONS); }",
    "    else if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.P) { list.add(Manifest.permission.WRITE_EXTERNAL_STORAGE); list.add(Manifest.permission.READ_EXTERNAL_STORAGE); }",
    "    return list.toArray(new String[0]);",
    "  }",
    "  @PluginMethod public void requestMediaPermission(PluginCall call) {",
    "    String[] perms = neededMediaPerms(); List<String> missing = new ArrayList<>();",
    "    for (String p : perms) { if (ContextCompat.checkSelfPermission(getContext(), p) != PackageManager.PERMISSION_GRANTED) missing.add(p); }",
    "    if (!missing.isEmpty() && getActivity() != null) { ActivityCompat.requestPermissions(getActivity(), missing.toArray(new String[0]), 9042); }",
    '    JSObject r = new JSObject(); r.put("granted", missing.isEmpty()); call.resolve(r);',
    "  }",
    "  @PluginMethod public void saveImage(PluginCall call) {",
    '    requestMediaPermission(call); String b64 = call.getString("base64"); String fn = call.getString("filename", "KISMET_" + System.currentTimeMillis() + ".png");',
    '    if (b64 == null || b64.isEmpty()) { call.reject("Empty image"); return; }',
    "    try {",
    '      if (b64.contains(",")) b64 = b64.substring(b64.indexOf(",") + 1);',
    "      byte[] bytes = Base64.decode(b64, Base64.DEFAULT);",
    "      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {",
    '        ContentValues v = new ContentValues(); v.put(MediaStore.Images.Media.DISPLAY_NAME, fn); v.put(MediaStore.Images.Media.MIME_TYPE, "image/png");',
    '        v.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/KISMET"); v.put(MediaStore.Images.Media.IS_PENDING, 1);',
    "        ContentResolver r = getContext().getContentResolver(); Uri u = r.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, v);",
    '        if (u == null) { call.reject("No uri"); return; }',
    '        try (OutputStream o = r.openOutputStream(u)) { if (o == null) throw new Exception("Null out"); o.write(bytes); }',
    "        v.clear(); v.put(MediaStore.Images.Media.IS_PENDING, 0); r.update(u, v, null, null);",
    "      } else {",
    '        File d = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), "KISMET"); if (!d.exists()) d.mkdirs();',
    "        File f = new File(d, fn); try (FileOutputStream fos = new FileOutputStream(f)) { fos.write(bytes); }",
    '        MediaScannerConnection.scanFile(getContext(), new String[]{f.getAbsolutePath()}, new String[]{"image/png"}, null);',
    "      }",
    '      JSObject ret = new JSObject(); ret.put("saved", true); call.resolve(ret);',
    "    } catch (Exception e) { call.reject(e.getMessage()); }",
    "  }",
    "  @PluginMethod public void saveFile(PluginCall call) {",
    '    String tx = call.getString("text"); String fn = call.getString("filename", "KISMET_" + System.currentTimeMillis() + ".csv"); String mm = call.getString("mime", "text/csv");',
    '    if (tx == null) { call.reject("Empty file"); return; }',
    "    try {",
    "      byte[] bytes = tx.getBytes(StandardCharsets.UTF_8);",
    "      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {",
    "        ContentValues v = new ContentValues(); v.put(MediaStore.Downloads.DISPLAY_NAME, fn); v.put(MediaStore.Downloads.MIME_TYPE, mm);",
    '        v.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/KISMET"); v.put(MediaStore.Downloads.IS_PENDING, 1);',
    "        ContentResolver r = getContext().getContentResolver(); Uri u = r.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);",
    '        if (u == null) { call.reject("No uri"); return; }',
    '        try (OutputStream o = r.openOutputStream(u)) { if (o == null) throw new Exception("Null out"); o.write(bytes); }',
    "        v.clear(); v.put(MediaStore.Downloads.IS_PENDING, 0); r.update(u, v, null, null);",
    "      } else {",
    '        File d = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "KISMET"); if (!d.exists()) d.mkdirs();',
    "        File f = new File(d, fn); try (FileOutputStream fos = new FileOutputStream(f)) { fos.write(bytes); }",
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

const manifestPath = "android/app/src/main/AndroidManifest.xml";
let xml = fs.readFileSync(manifestPath, "utf8");
const perms = [
    '<uses-permission android:name="android.permission.VIBRATE" />',
    '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />',
    '<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />',
    '<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="29" />'
].join("\n");
xml = xml.replace('<uses-permission android:name="android.permission.INTERNET" />', '<uses-permission android:name="android.permission.INTERNET" />\n' + perms);
fs.writeFileSync(manifestPath, xml, "utf8");

const iconFile = fs.existsSync("1000532061.jpg") ? "1000532061.jpg" : allFiles.find(f => /\.(jpg|jpeg)$/i.test(f));
if (iconFile) {
    run("sudo apt-get update -qq && sudo apt-get install -y -qq imagemagick");
    fs.rmSync("android/app/src/main/res/mipmap-anydpi-v26", { recursive: true, force: true });
    [["mdpi", 48], ["hdpi", 72], ["xhdpi", 96], ["xxhdpi", 144], ["xxxhdpi", 192]].forEach(([dir, size]) => {
        const out = `android/app/src/main/res/mipmap-${dir}/ic_launcher.png`;
        const outRound = `android/app/src/main/res/mipmap-${dir}/ic_launcher_round.png`;
        run(`convert "${iconFile}" -resize "${size}x${size}^" -gravity center -extent "${size}x${size}" "${out}"`);
        fs.copyFileSync(out, outRound);
    });
}
run("chmod +x gradlew && ./gradlew assembleDebug", "android");
fs.copyFileSync("android/app/build/outputs/apk/debug/app-debug.apk", "KISMET.apk");
