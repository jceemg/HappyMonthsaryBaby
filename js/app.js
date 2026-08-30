const data={timeline:[
["January 8","The First Talk","My first chat with you. I was super nervous, but somehow that first conversation became the beginning of us."],
["January 20","A Little Rejection","You set your boundaries, and somehow we found our way back to each other the next day."],
["February 14","Our First Date","We finally met, went to an escape room, got lost in Makati, and the day became one of our first big memories."],
["March 27–30","Matching Tattoos","We got matching spider tattoos and took a trip to Pampanga."],
["April 9 & 11","You Watched Me Play","You visited my town for the first time and watched my volleyball games."],
["May 3","Aqua Planet","We celebrated your birthday and I went on my first family trip with you."],
["June 5","Binyagan","You came to Lucban for my cousin's binyagan and my late birthday celebration."],
["June 25–30","Family & Friends","Your mother's birthday, your cousin's debut, my immigration trip, and meeting more of your friends and family."],
["July 27","Spider-Man & My First Motor","You helped us move house, watched Spider-Man with me, and were there when I got my first motor."],
["August 17","The Game We Finally Finished","You came to watch my volleyball game and we finally got to finish it."]],
love:[["Your Smile","It can completely change my mood."],["Your Eyes","I could stare at them for way too long."],["Your Nose","Yes. Your nose. I love it."],["Your Bickering","I secretly love when you argue with me."],["Your Cute Voice","Especially when you're being cute without realizing it."],["The Way You Scold Me","Somehow even getting scolded by you is adorable."],["The Way You Treat Me","I love when you treat me like your baby."],["Your Laugh","Even the interesting ones."],["Just You","I love you for being you."]],
memories:JSON.parse(localStorage.getItem("memories")||"[]"),
letter:localStorage.getItem("letter")||`<p>Hello baby, it's me Caleb.</p><p>I hope you like this. I put a lot of effort into it because I wanted to make something that was ours.</p><p>I wanna dedicate this message to you, and thank you for being with me. I love you so much and I know I don't express it often but from the bottom of my heart, you're very precious to me.</p><p>Happy monthsary, love. I can't wait to see you again. Mwahhhh.</p><p class="signature">— Caleb</p>`};
const $=s=>document.querySelector(s);
$("#openGift").onclick=()=>{$("#opening").classList.add("hidden");$("#site").classList.remove("hidden");scrollTo(0,0)};
function renderTimeline(){$("#timeline").innerHTML=data.timeline.map(x=>`<article class="timeline-event"><div class="timeline-date">${x[0]}</div><h3>${x[1]}</h3><p>${x[2]}</p></article>`).join("")}
function renderLove(){$("#loveGrid").innerHTML=data.love.map(x=>`<article class="love-item"><h3>${x[0]}</h3><p>${x[1]}</p></article>`).join("")}
function renderFilters(){let cats=["all",...new Set(data.memories.map(m=>m.category).filter(Boolean))];$("#filters").innerHTML=cats.map(c=>`<button data-cat="${c}">${c[0].toUpperCase()+c.slice(1)}</button>`).join("");document.querySelectorAll("[data-cat]").forEach(b=>b.onclick=()=>renderGallery(b.dataset.cat))}
function renderGallery(cat="all"){let ms=cat==="all"?data.memories:data.memories.filter(m=>m.category===cat);$("#gallery").innerHTML=ms.length?ms.map(m=>`<article class="memory">${m.type==="video"?`<video controls src="${m.url}"></video>`:`<img loading="lazy" src="${m.url}" alt="">`}<p>${m.caption||""}</p><small>${m.date||""} · ${m.category||""}</small></article>`).join(""):`<p class="empty">No memories yet. Add them from Admin.</p>`}
$("#letterText").innerHTML=data.letter;renderTimeline();renderLove();renderFilters();renderGallery();
document.querySelectorAll(".surprise").forEach(b=>b.onclick=()=>alert(b.dataset.message));
function countdown(){let n=new Date(),target=new Date(n.getFullYear(),n.getMonth()+1,1),d=target-n,days=Math.floor(d/864e5),h=Math.floor(d/36e5)%24,m=Math.floor(d/6e4)%60,s=Math.floor(d/1e3)%60;$("#countdown").textContent=`${String(days).padStart(2,"0")} : ${String(h).padStart(2,"0")} : ${String(m).padStart(2,"0")} : ${String(s).padStart(2,"0")}`}setInterval(countdown,1000);countdown();