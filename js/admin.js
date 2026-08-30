import { db } from "./firebase.js";
import { ADMIN_PASSWORD } from "./firebase-config.js";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const $ = s => document.querySelector(s);
let memories = [];

$("#loginBtn").onclick = () => {
  if ($("#password").value === ADMIN_PASSWORD) {
    $("#login").classList.add("hidden");
    $("#dash").classList.remove("hidden");
    load();
  } else {
    alert("Incorrect password.");
  }
};

function render() {
  $("#list").innerHTML = memories.length
    ? memories.map((m) => `<div class="memory-admin">${m.type === "video" ? `<video controls src="${m.url}"></video>` : `<img src="${m.url}">`}<div><strong>${m.caption || "Untitled"}</strong><br><small>${m.date || ""} · ${m.category || ""}</small></div><button onclick="removeMemory('${m.id}')">Delete</button></div>`).join("")
    : "<p>No memories yet. Add one above.</p>";
}

window.removeMemory = async (id) => {
  if (!confirm("Delete this memory?")) return;
  try {
    await deleteDoc(doc(db, "memories", id));
  } catch (err) {
    alert("Could not delete: " + err.message);
  }
};

function load() {
  onSnapshot(collection(db, "memories"), snap => {
    memories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
  });
  onSnapshot(doc(db, "content", "letter"), snap => {
    if (snap.exists()) $("#letter").value = snap.data().html;
  });
}

// Upload a file to a free permanent host (catbox.moe). Returns the public URL.
// We use catbox because it needs no account, no API key, and no credit card,
// and images/videos are kept permanently.
async function uploadToHost(file) {
  const fd = new FormData();
  fd.append("reqtype", "fileupload");
  fd.append("fileToUpload", file, file.name);
  const res = await fetch("https://catbox.moe/user/api.php", { method: "POST", body: fd });
  if (!res.ok) throw new Error("Host upload failed (" + res.status + ")");
  const url = (await res.text()).trim();
  if (!/^https?:\/\//.test(url)) throw new Error("Host returned an error: " + url);
  return url;
}

const $drop = $("#dropzone");
const $file = $("#file");
const $addBtn = $("#add");

let pendingFiles = [];

function setDropText() {
  $drop.querySelector("p").innerHTML = pendingFiles.length
    ? `<strong>${pendingFiles.length} file(s) ready.</strong><br>Drop more or click <strong>Add Memory</strong> to upload.`
    : 'Drag &amp; drop photos or videos here,<br>or <strong>click to browse</strong>';
}

$drop.addEventListener("click", () => $file.click());
$file.addEventListener("change", () => {
  if ($file.files.length) {
    pendingFiles = pendingFiles.concat([...$file.files]);
    setDropText();
  }
  $file.value = "";
});

["dragenter", "dragover"].forEach(t =>
  $drop.addEventListener(t, e => { e.preventDefault(); $drop.classList.add("dragover"); })
);
["dragleave", "drop"].forEach(t =>
  $drop.addEventListener(t, e => { e.preventDefault(); $drop.classList.remove("dragover"); })
);
$drop.addEventListener("drop", e => {
  const files = [...(e.dataTransfer?.files || [])].filter(f => f.type.startsWith("image/") || f.type.startsWith("video/"));
  if (!files.length) { alert("Only photos and videos are supported."); return; }
  pendingFiles = pendingFiles.concat(files);
  setDropText();
});

async function uploadFiles(files) {
  $addBtn.disabled = true;
  $addBtn.textContent = `Uploading 0/${files.length}...`;
  const caption = $("#caption").value;
  const date = $("#date").value;
  const category = $("#category").value;
  let ok = 0;
  for (let i = 0; i < files.length; i++) {
    $addBtn.textContent = `Uploading ${i}/${files.length}...`;
    try {
      const f = files[i];
      const isVideo = f.type.startsWith("video/");
      const url = await uploadToHost(f);
      await addDoc(collection(db, "memories"), {
        url,
        type: isVideo ? "video" : "image",
        caption,
        date,
        category
      });
      ok++;
    } catch (err) {
      alert(`"${files[i].name}" failed: ${err.message}`);
    }
  }
  $addBtn.disabled = false;
  $addBtn.textContent = "Add Memory";
  if (ok) {
    $("#caption").value = "";
    $("#date").value = "";
    $("#category").value = "";
    alert(`${ok} memory(ies) added!`);
  }
}

$("#add").onclick = () => {
  if (!pendingFiles.length) { alert("Choose or drag in a photo or video first."); return; }
  const toUpload = pendingFiles;
  pendingFiles = [];
  setDropText();
  uploadFiles(toUpload);
};

$("#saveLetter").onclick = async () => {
  await setDoc(doc(db, "content", "letter"), { html: $("#letter").value });
  alert("Letter saved to the cloud.");
};
