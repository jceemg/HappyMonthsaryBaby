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

$("#add").onclick = async () => {
  const f = $("#file").files[0];
  const btn = $("#add");
  if (!f) return alert("Choose a photo or video.");
  btn.disabled = true;
  btn.textContent = "Uploading...";
  try {
    const isVideo = f.type.startsWith("video/");
    const url = await uploadToHost(f);
    await addDoc(collection(db, "memories"), {
      url,
      type: isVideo ? "video" : "image",
      caption: $("#caption").value,
      date: $("#date").value,
      category: $("#category").value
    });
    $("#file").value = "";
    $("#caption").value = "";
    $("#date").value = "";
    $("#category").value = "";
    alert("Memory added!");
  } catch (err) {
    alert("Upload failed: " + err.message + "\n\nTip: if Catbox is unreachable, try again in a moment or use a smaller file.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Add Memory";
  }
};

$("#saveLetter").onclick = async () => {
  await setDoc(doc(db, "content", "letter"), { html: $("#letter").value });
  alert("Letter saved to the cloud.");
};
