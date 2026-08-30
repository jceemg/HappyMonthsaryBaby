import { db } from "./firebase.js";
import { ADMIN_PASSWORD, IMGBB_KEY } from "./firebase-config.js";
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
    if (snap.exists()) $("#letter").value = snap.data().html;
  });
}

// Upload an image to imgbb (free, permanent, CORS-friendly) and return the
// direct image URL. imgbb requires an API key but no credit card.
async function uploadToHost(file) {
  const fd = new FormData();
  fd.append("image", file, file.name);
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method: "POST", body: fd });
  const j = await res.json();
  if (!res.ok || !j.success) {
    throw new Error(j && j.error && j.error.message ? j.error.message : "imgbb upload failed (" + res.status + ")");
  }
  return j.data.display_url || j.data.url;
}

const $drop = $("#dropzone");
const $file = $("#file");
const $addBtn = $("#add");

let pendingFiles = [];

function setDropText() {
  if (!pendingFiles.length) {
    $drop.querySelector("p").innerHTML = 'Drag &amp; drop photos here,<br>or <strong>click to browse</strong>';
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
  const files = [...(e.dataTransfer?.files || [])].filter(f => f.type.startsWith("image/"));
  if (e.dataTransfer?.files?.length && !files.length) { alert("imgbb only supports images (photos). Videos can't be uploaded here."); return; }
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
      const url = await uploadToHost(f);
      await addDoc(collection(db, "memories"), {
        url,
        type: "image",
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
    alert(`${ok} photo(s) added!`);
  }
}

$("#add").onclick = () => {
  if (!pendingFiles.length) { alert("Choose or drag in a photo first."); return; }
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
  await setDoc(doc(db, "content", "letter"), { html: $("#letter").value });
  alert("Letter saved to the cloud.");
};
