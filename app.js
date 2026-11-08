/* Portal Kelas VII C. Semua pembatasan akses utama wajib ditegakkan oleh RLS di Supabase. */
const $ = (s) => document.querySelector(s);
const clientReady = window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY &&
  !window.SUPABASE_URL.includes("PROJECT-REF") && !window.SUPABASE_ANON_KEY.includes("SUPABASE_ANON");
const db = clientReady ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY) : null;
let currentUser = null, profile = null, activePage = "home", unread = 0;
const pageNames = {home:"Beranda",attendance:"Presensi",duty:"Jadwal Piket",announcements:"Pengumuman",cash:"Uang Kas",notifications:"Notifikasi",admin:"Panel Admin"};
const esc = (v="") => String(v).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const dateID = (d) => new Date(d+"T00:00:00").toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"});
const isAdmin = () => profile?.role === "admin";
function showError(msg){$("#loginError").textContent=msg;}
async function init(){
  if(!db){showError("Konfigurasi belum diisi. Ikuti README untuk membuat config.js.");return;}
  const {data:{session}}=await db.auth.getSession();
  if(session) await enterApp(session.user);
  db.auth.onAuthStateChange(async (_event,session)=>{if(session&&!currentUser) await enterApp(session.user); if(!session) showLogin();});
}
function showLogin(){$("#appView").classList.add("hidden");$("#loginView").classList.remove("hidden");currentUser=null;profile=null;}
async function enterApp(user){
  currentUser=user;
  const {data,error}=await db.from("profiles").select("id,full_name,role").eq("id",user.id).single();
  if(error||!data){await db.auth.signOut();showLogin();showError("Profil akun belum disiapkan admin. Hubungi admin kelas.");return;}
  profile=data;
  $("#loginView").classList.add("hidden");$("#appView").classList.remove("hidden");
  $("#userLabel").textContent=profile.full_name;$("#rolePill").textContent=isAdmin()?"Admin":"Siswa";
  document.querySelectorAll(".admin-only").forEach(el=>el.classList.toggle("hidden",!isAdmin()));
  await refreshUnread();renderPage("home");
}
async function refreshUnread(){
  const {count}=await db.from("notifications").select("*",{count:"exact",head:true}).eq("user_id",currentUser.id).eq("is_read",false);
  unread=count||0;$("#noticeCount").textContent=unread||"";
}
function nav(page){if(page==="admin"&&!isAdmin())return;renderPage(page);}
async function renderPage(page){
  activePage=page;$("#pageTitle").textContent=pageNames[page]||"Beranda";
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
  const root=$("#pageContent");root.innerHTML='<div class="card">Memuat data…</div>';
  try{
    if(page==="home") root.innerHTML=await homePage();
    if(page==="attendance") root.innerHTML=await attendancePage();
    if(page==="duty") root.innerHTML=await dutyPage();
    if(page==="announcements") root.innerHTML=await announcementsPage();
    if(page==="cash") root.innerHTML=await cashPage();
    if(page==="notifications") root.innerHTML=await notificationsPage();
    if(page==="admin") root.innerHTML=await adminPage();
  }catch(e){root.innerHTML=`<div class="card"><b>Data belum dapat dimuat.</b><p class="muted">${esc(e.message)}</p></div>`;}
}
async function rows(table,select="*"){const q=db.from(table).select(select);return q;}
async function homePage(){
  const [a,d,n,c]=await Promise.all([
    db.from("attendance").select("status,date").eq("student_id",currentUser.id),
    db.from("duty_schedules").select("duty_date,task").eq("student_id",currentUser.id).gte("duty_date",new Date().toISOString().slice(0,10)).order("duty_date").limit(3),
    db.from("announcements").select("title,body,created_at").order("created_at",{ascending:false}).limit(3),
    db.from("cash_payments").select("month,year,amount,paid").eq("student_id",currentUser.id).order("year",{ascending:false}).order("month",{ascending:false}).limit(1)
  ]);
  const attendance=a.data||[], present=attendance.filter(x=>x.status==="masuk").length, absent=attendance.filter(x=>x.status==="tidak_masuk").length;
  return `<div class="grid">
    <div class="card"><div class="stat-label">Total masuk tercatat</div><div class="stat-value">${present}</div><div class="stat-sub">Hari sekolah</div></div>
    <div class="card"><div class="stat-label">Total tidak masuk</div><div class="stat-value">${absent}</div><div class="stat-sub">Hari sekolah</div></div>
    <div class="card"><div class="stat-label">Jadwal piket mendatang</div><div class="stat-value">${(d.data||[]).length}</div><div class="stat-sub">Jadwal kamu</div></div>
  </div>
  <div class="card"><h2 class="section-title">Jadwal piket terdekat</h2>${(d.data||[]).length?(d.data||[]).map(x=>`<div class="item"><div class="row"><b>${dateID(x.duty_date)}</b><span class="tag warn">Piket</span></div><div class="item-meta">${esc(x.task||"Tugas piket kelas")}</div></div>`).join(""):'<p class="empty">Belum ada jadwal piket.</p>'}</div>
  <div class="card"><h2 class="section-title">Pengumuman terbaru</h2>${(n.data||[]).length?(n.data||[]).map(x=>`<div class="item"><b>${esc(x.title)}</b><p class="muted">${esc(x.body)}</p></div>`).join(""):'<p class="empty">Belum ada pengumuman.</p>'}</div>`;
}
async function attendancePage(){
  const {data,error}=await db.from("attendance").select("date,status,note").eq("student_id",currentUser.id).order("date",{ascending:false}).limit(100);if(error)throw error;
  const list=data||[],present=list.filter(x=>x.status==="masuk").length,absent=list.filter(x=>x.status==="tidak_masuk").length;
  return `<div class="grid"><div class="card"><div class="stat-label">Masuk</div><div class="stat-value">${present}</div></div><div class="card"><div class="stat-label">Tidak masuk</div><div class="stat-value">${absent}</div></div><div class="card"><div class="stat-label">Total tercatat</div><div class="stat-value">${list.length}</div></div></div>
  <div class="card"><h2 class="section-title">Riwayat presensi</h2><div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Status</th><th>Catatan</th></tr></thead><tbody>${list.map(x=>`<tr><td>${dateID(x.date)}</td><td><span class="tag ${x.status==="masuk"?"good":"bad"}">${x.status==="masuk"?"Masuk":"Tidak masuk"}</span></td><td>${esc(x.note||"-")}</td></tr>`).join("")||'<tr><td colspan="3" class="empty">Belum ada data presensi.</td></tr>'}</tbody></table></div></div>`;
}
async function dutyPage(){
  const {data,error}=await db.from("duty_schedules").select("duty_date,task").eq("student_id",currentUser.id).order("duty_date",{ascending:true}).limit(100);if(error)throw error;
  return `<div class="card"><h2 class="section-title">Jadwal piket kamu</h2>${(data||[]).map(x=>`<div class="item row"><div><b>${dateID(x.duty_date)}</b><div class="item-meta">${esc(x.task||"Tugas piket kelas")}</div></div><span class="tag warn">${new Date(x.duty_date+"T00:00:00").toLocaleDateString("id-ID",{weekday:"long"})}</span></div>`).join("")||'<p class="empty">Belum ada jadwal piket.</p>'}</div>`;
}
async function announcementsPage(){
  const {data,error}=await db.from("announcements").select("title,body,created_at").order("created_at",{ascending:false});if(error)throw error;
  return `<div class="card"><h2 class="section-title">Pengumuman kelas</h2>${(data||[]).map(x=>`<div class="item"><b>${esc(x.title)}</b><div class="item-meta">${new Date(x.created_at).toLocaleString("id-ID")}</div><p>${esc(x.body)}</p></div>`).join("")||'<p class="empty">Belum ada pengumuman.</p>'}</div>`;
}
async function cashPage(){
  const {data,error}=await db.from("cash_payments").select("month,year,amount,paid,paid_at").eq("student_id",currentUser.id).order("year",{ascending:false}).order("month",{ascending:false});if(error)throw error;
  return `<div class="card"><h2 class="section-title">Status uang kas</h2><p class="muted">Status pembayaran dicatat oleh admin.</p><div class="table-wrap"><table><thead><tr><th>Bulan</th><th>Jumlah</th><th>Status</th><th>Tanggal bayar</th></tr></thead><tbody>${(data||[]).map(x=>`<tr><td>${esc(x.month)} ${x.year}</td><td>Rp${Number(x.amount).toLocaleString("id-ID")}</td><td><span class="tag ${x.paid?"good":"warn"}">${x.paid?"Lunas":"Belum lunas"}</span></td><td>${x.paid_at?dateID(x.paid_at.slice(0,10)):"-"}</td></tr>`).join("")||'<tr><td colspan="4" class="empty">Belum ada data uang kas.</td></tr>'}</tbody></table></div></div>`;
}
async function notificationsPage(){
  const {data,error}=await db.from("notifications").select("id,title,body,created_at,is_read").eq("user_id",currentUser.id).order("created_at",{ascending:false}).limit(100);if(error)throw error;
  return `<div class="card"><div class="row"><h2 class="section-title">Notifikasi kamu</h2><button class="secondary" id="readAllBtn">Tandai semua dibaca</button></div>${(data||[]).map(x=>`<div class="item notice"><div class="row"><b>${esc(x.title)}</b>${x.is_read?'<span class="tag">Dibaca</span>':'<span class="tag warn">Baru</span>'}</div><p>${esc(x.body)}</p><div class="item-meta">${new Date(x.created_at).toLocaleString("id-ID")}</div></div>`).join("")||'<p class="empty">Belum ada notifikasi.</p>'}</div>`;
}
async function adminPage(){
  const {data:students,error}=await db.from("profiles").select("id,full_name,role").eq("role","siswa").order("full_name");if(error)throw error;
  return `<div class="card"><h2 class="section-title">Daftar siswa</h2><p class="muted">Jumlah akun siswa: ${(students||[]).length} dari target 28.</p><div class="table-wrap"><table><thead><tr><th>Nama siswa</th><th>ID akun</th></tr></thead><tbody>${(students||[]).map(s=>`<tr><td>${esc(s.full_name)}</td><td>${esc(s.id.slice(0,8))}…</td></tr>`).join("")||'<tr><td colspan="2">Belum ada siswa.</td></tr>'}</tbody></table></div></div>
  <div class="grid"><div class="card"><h2 class="section-title">Buat pengumuman</h2><form id="announcementForm"><label>Judul<input name="title" required></label><label>Isi<textarea name="body" rows="3" required></textarea></label><button class="primary">Terbitkan</button></form></div>
  <div class="card"><h2 class="section-title">Catat presensi</h2><form id="attendanceForm"><label>Siswa<select name="student_id" required>${(students||[]).map(s=>`<option value="${s.id}">${esc(s.full_name)}</option>`).join("")}</select></label><label>Tanggal<input name="date" type="date" required value="${new Date().toISOString().slice(0,10)}"></label><label>Status<select name="status"><option value="masuk">Masuk</option><option value="tidak_masuk">Tidak masuk</option></select></label><label>Catatan<input name="note"></label><button class="primary">Simpan presensi</button></form></div></div>
  <div class="grid"><div class="card"><h2 class="section-title">Atur jadwal piket</h2><form id="dutyForm"><label>Siswa<select name="student_id" required>${(students||[]).map(s=>`<option value="${s.id}">${esc(s.full_name)}</option>`).join("")}</select></label><label>Tanggal<input name="duty_date" type="date" required></label><label>Tugas<input name="task" value="Piket kelas"></label><button class="primary">Simpan jadwal & buat pengingat</button></form></div>
  <div class="card"><h2 class="section-title">Catat uang kas</h2><form id="cashForm"><label>Siswa<select name="student_id" required>${(students||[]).map(s=>`<option value="${s.id}">${esc(s.full_name)}</option>`).join("")}</select></label><label>Bulan<input name="month" placeholder="November" required></label><label>Tahun<input name="year" type="number" value="${new Date().getFullYear()}" required></label><label>Jumlah (Rp)<input name="amount" type="number" min="0" required></label><label>Status<select name="paid"><option value="false">Belum lunas</option><option value="true">Lunas</option></select></label><button class="primary">Simpan pembayaran</button></form></div></div>
  <div class="card"><h2 class="section-title">Pengingat uang kas</h2><p class="muted">Buat notifikasi untuk siswa yang belum melunasi kas pada bulan dan tahun yang dipilih.</p><form id="cashNoticeForm" class="form-grid"><label>Bulan<input name="month" placeholder="November" required></label><label>Tahun<input name="year" type="number" value="${new Date().getFullYear()}" required></label><button class="primary full">Kirim pengingat belum lunas</button></form></div>`;
}
async function createNotification(userId,title,body){
  return db.from("notifications").insert({user_id:userId,title,body});
}
function formData(form){return Object.fromEntries(new FormData(form).entries());}
document.addEventListener("click",async e=>{
  const navBtn=e.target.closest("[data-page],[data-goto]");if(navBtn){nav(navBtn.dataset.page||navBtn.dataset.goto);return;}
  if(e.target.id==="readAllBtn"){const {error}=await db.from("notifications").update({is_read:true}).eq("user_id",currentUser.id);if(error)alert(error.message);await refreshUnread();renderPage("notifications");}
});
document.addEventListener("submit",async e=>{
  e.preventDefault();const f=e.target,d=formData(f);let result;
  try{
    if(f.id==="loginForm"){const {error}=await db.auth.signInWithPassword({email:d.email,password:d.password});if(error)showError(error.message);return;}
    if(!isAdmin())return alert("Akses admin diperlukan.");
    if(f.id==="announcementForm"){
      result=await db.from("announcements").insert({title:d.title,body:d.body,created_by:currentUser.id}).select("id").single();
      if(!result.error){const {data:students}=await db.from("profiles").select("id").eq("role","siswa");for(const s of students||[])await createNotification(s.id,"Pengumuman baru",d.title);}
    }
    if(f.id==="attendanceForm")result=await db.from("attendance").upsert({student_id:d.student_id,date:d.date,status:d.status,note:d.note,recorded_by:currentUser.id},{onConflict:"student_id,date"});
    if(f.id==="dutyForm"){
      result=await db.from("duty_schedules").insert({student_id:d.student_id,duty_date:d.duty_date,task:d.task,created_by:currentUser.id});
      if(!result.error)await createNotification(d.student_id,"Jadwal piket","Kamu mendapat jadwal piket pada "+dateID(d.duty_date)+". "+d.task);
    }
    if(f.id==="cashForm")result=await db.from("cash_payments").upsert({student_id:d.student_id,month:d.month,year:Number(d.year),amount:Number(d.amount),paid:d.paid==="true",paid_at:d.paid==="true"?new Date().toISOString().slice(0,10):null,recorded_by:currentUser.id},{onConflict:"student_id,month,year"});
    if(f.id==="cashNoticeForm"){
      const {data:unpaid,error}=await db.from("cash_payments").select("student_id").eq("month",d.month).eq("year",Number(d.year)).eq("paid",false);if(error)throw error;
      for(const s of unpaid||[])await createNotification(s.student_id,"Pengingat uang kas",`Uang kas bulan ${d.month} ${d.year} belum lunas.`);
      alert(`Pengingat dikirim ke ${unpaid.length} siswa.`);f.reset();return;
    }
    if(result?.error)throw result.error;
    alert("Data berhasil disimpan.");f.reset();renderPage(activePage);
  }catch(err){alert("Gagal: "+err.message);}
});
$("#logoutBtn").addEventListener("click",()=>db.auth.signOut());
init();