import { db } from "./firebase.js";
import { ADMIN_PASSWORD, CLOUD_NAME, UPLOAD_PRESET } from "./firebase-config.js";
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

// Convert the stored HTML letter into plain text for easy editing.
function htmlToText(html) {
  if (!html) return html;
  const d = document.createElement("div");
  d.innerHTML = html;
  // Turn </p> block boundaries into newlines so paragraphs read on separate lines.
  d.querySelectorAll("p").forEach(p => p.append(d.ownerDocument.createTextNode("\n")));
  return d.textContent.replace(/\n+/g, "\n").trim();
}

// Convert the edited plain text back into HTML paragraphs for the site.
function textToHtml(text) {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  return escaped
    .split(/\n{2,}/)                     // blank line = new paragraph
    .map(block => block.replace(/\n/g, " ").trim())
    .filter(Boolean)
    .map(block => `<p>${block}</p>`)
    .join("");
}

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
    ? memories.map((m) => `<div class="memory-admin">${m.type === "video" ? `<video controls src="${m.url}"></video>` : `<img src="${m.url}">`}<div><strong>${m.caption || "Untitled"}</strong><br><small>${m.date || ""} · ${m.category || ""}</small></div><button class="del" type="button" onclick="removeMemory('${m.id}')">Delete</button></div>`).join("")
    : "<p>No memories yet. Add one above.</p>";
}

window.removeMemory = async (id) => {
  const m = memories.find(x => x.id === id);
  const label = m && (m.caption || m.date) ? `"${m.caption || m.date}"` : "this memory";
  if (!confirm(`Really delete ${label}?`)) return;
  if (!confirm(`Delete ${label} for good? This can't be undone.`)) return;
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
    if (snap.exists()) $("#letter").value = htmlToText(snap.data().html);
  });
}

// Upload a file to Cloudinary (free, permanent, reliable global CDN) and return
// its secure URL. Uses an unsigned upload preset so no API secret is exposed.
async function uploadToHost(file, isVideo) {
  const typePath = isVideo ? "video" : "image";
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${typePath}/upload`;
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", UPLOAD_PRESET);
  const res = await fetch(url, { method: "POST", body: fd });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.secure_url) {
    throw new Error((j.error && j.error.message) ? j.error.message : "Cloudinary upload failed (" + res.status + ")");
  }
  return j.secure_url;
}

const $drop = $("#dropzone");
const $file = $("#file");
const $addBtn = $("#add");

let pendingFiles = [];

function setDropText() {
  if (!pendingFiles.length) {
    $drop.querySelector("p").innerHTML = 'Drag &amp; drop photos or videos here,<br>or <strong>click to browse</strong>';
    return;
  }
  const names = pendingFiles.map(f => f.name).join(", ");
  $drop.querySelector("p").innerHTML = `<strong>${pendingFiles.length} file(s) ready:</strong><br>${names}<br><small>Drop more or click <strong>Add Memory</strong> to upload.</small>`;
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
  const skipped = e.dataTransfer?.files?.length - files.length;
  if (skipped > 0) alert(`${skipped} file(s) skipped — only photos and videos are supported.`);
  if (!files.length) return;
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
      const url = await uploadToHost(f, isVideo);
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
    alert(`${ok} item(s) added!`);
  }
}

$("#add").onclick = () => {
  if (!pendingFiles.length) { alert("Choose or drag in a photo or video first."); return; }
  if (!$("#caption").value.trim()) {
    $("#caption").focus();
    alert("Please add a caption before saving.");
    return;
  }
  const toUpload = pendingFiles;
  pendingFiles = [];
  setDropText();
  uploadFiles(toUpload);
};

$("#clear").onclick = () => {
  if (!pendingFiles.length) { alert("Nothing selected to clear."); return; }
  if (confirm(`Clear ${pendingFiles.length} selected file(s)?`)) {
    pendingFiles = [];
    setDropText();
  }
};

$("#saveLetter").onclick = async () => {
  const text = $("#letter").value.trim();
  if (!text) { alert("Please write something in the letter before saving."); return; }
  const html = textToHtml(text);
  await setDoc(doc(db, "content", "letter"), { html });
  alert("Letter saved to the cloud.");
};

$("#deleteLetter").onclick = async () => {
  if (!confirm("Delete the saved letter? The site will go back to its default message.")) return;
  if (!confirm("Delete the letter for good? This can't be undone.")) return;
  try {
    await deleteDoc(doc(db, "content", "letter"));
    $("#letter").value = "";
    alert("Letter deleted.");
  } catch (err) {
    alert("Could not delete: " + err.message);
  }
};
