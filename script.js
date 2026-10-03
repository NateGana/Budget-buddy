// BudgetBuddy – simple income & expense tracker (data saved in LocalStorage)
const KEY = "budgetbuddy-data";
const EXPENSE_CATS = ["Food","Transport","School","Entertainment","Bills","Other"];
const INCOME_CATS = ["Allowance","Salary","Other"];
const pad = n => String(n).padStart(2,"0");
const toISO = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const today = () => toISO(new Date());
const offset = days => { const d=new Date(); d.setDate(d.getDate()+days); return toISO(d); };
const fmtDate = s => new Date(s+"T00:00").toLocaleDateString(undefined,{month:"short",day:"numeric"});
const money = n => "₱" + n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});

function sampleData(){
  return { txns: [
    { id:1, desc:"Monthly allowance", type:"Income", category:"Allowance", amount:5000, date:offset(-6) },
    { id:2, desc:"Canteen lunch", type:"Expense", category:"Food", amount:120, date:offset(-5) },
    { id:3, desc:"Jeepney fare", type:"Expense", category:"Transport", amount:30, date:offset(-5) },
    { id:4, desc:"Printed handouts", type:"Expense", category:"School", amount:85, date:offset(-4) },
    { id:5, desc:"Movie night", type:"Expense", category:"Entertainment", amount:250, date:offset(-3) },
    { id:6, desc:"Part-time tutoring", type:"Income", category:"Salary", amount:800, date:offset(-2) },
    { id:7, desc:"Mobile load", type:"Expense", category:"Bills", amount:100, date:offset(-1) },
    { id:8, desc:"Coffee with friends", type:"Expense", category:"Food", amount:150, date:offset(0) }
  ]};
}
function loadData(){
  try{ const s = JSON.parse(localStorage.getItem(KEY)); if (s && Array.isArray(s.txns)) return s; }catch(e){}
  const fresh = sampleData(); localStorage.setItem(KEY, JSON.stringify(fresh)); return fresh;
}
let data = loadData();
const save = () => localStorage.setItem(KEY, JSON.stringify(data));
const nextId = list => list.reduce((m,x)=>Math.max(m,x.id),0)+1;

const $ = id => document.getElementById(id);
const esc = t => { const d=document.createElement("div"); d.textContent=t??""; return d.innerHTML; };
let toastTimer;
function toast(msg){ $("toast").textContent=msg; $("toast").classList.add("show"); clearTimeout(toastTimer); toastTimer=setTimeout(()=>$("toast").classList.remove("show"),2200); }

document.querySelectorAll(".nav-btn").forEach(btn=>btn.addEventListener("click",()=>{
  document.querySelectorAll(".nav-btn,.view").forEach(el=>el.classList.remove("active"));
  btn.classList.add("active"); $(btn.dataset.view).classList.add("active");
}));

function catOptions(type){ return (type==="Income"?INCOME_CATS:EXPENSE_CATS); }
$("f_type").addEventListener("change", ()=>{
  $("f_category").innerHTML = catOptions($("f_type").value).map(c=>`<option>${c}</option>`).join("");
});

let editingId = null;
function openForm(txn){
  editingId = txn ? txn.id : null;
  $("formTitle").textContent = txn ? "Edit Transaction" : "Add Transaction";
  $("f_desc").value = txn ? txn.desc : "";
  $("f_type").value = txn ? txn.type : "Expense";
  $("f_category").innerHTML = catOptions($("f_type").value).map(c=>`<option>${c}</option>`).join("");
  $("f_category").value = txn ? txn.category : catOptions($("f_type").value)[0];
  $("f_amount").value = txn ? txn.amount : "";
  $("f_date").value = txn ? txn.date : today();
  $("modal").hidden = false; $("f_desc").focus();
}
function closeForm(){ $("modal").hidden = true; editingId = null; }
$("addTxnBtn").addEventListener("click",()=>openForm());
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",closeForm));
$("modal").addEventListener("click",e=>{ if(e.target===$("modal")) closeForm(); });
document.addEventListener("keydown",e=>{ if(e.key==="Escape") closeForm(); });

$("form").addEventListener("submit", e=>{
  e.preventDefault();
  const desc = $("f_desc").value.trim();
  const amount = parseFloat($("f_amount").value);
  if (!desc) return toast("Please enter a description");
  if (!(amount > 0)) return toast("Amount must be greater than 0");
  const values = { desc, type: $("f_type").value, category: $("f_category").value, amount, date: $("f_date").value };
  if (editingId){ Object.assign(data.txns.find(t=>t.id===editingId), values); toast("Transaction updated"); }
  else { data.txns.push({ id: nextId(data.txns), ...values }); toast("Transaction added"); }
  save(); closeForm(); renderAll();
});

function renderDashboard(){
  const income = data.txns.filter(t=>t.type==="Income").reduce((s,t)=>s+t.amount,0);
  const expense = data.txns.filter(t=>t.type==="Expense").reduce((s,t)=>s+t.amount,0);
  const balance = income - expense;
  $("stats").innerHTML = `
    <div class="card"><span>Balance</span><strong class="${balance>=0?"pos":"neg"}">${money(balance)}</strong></div>
    <div class="card"><span>Total Income</span><strong class="pos">${money(income)}</strong></div>
    <div class="card"><span>Total Expenses</span><strong class="neg">${money(expense)}</strong></div>
    <div class="card"><span>Transactions</span><strong>${data.txns.length}</strong></div>`;

  const byCat = {};
  data.txns.filter(t=>t.type==="Expense").forEach(t=>{ byCat[t.category] = (byCat[t.category]||0) + t.amount; });
  const maxCat = Math.max(1, ...Object.values(byCat));
  const cats = Object.entries(byCat).sort((a,b)=>b[1]-a[1]);
  $("catBars").innerHTML = cats.length ? cats.map(([c,amt])=>`
    <div class="catrow"><span class="name">${esc(c)}</span>
      <span class="track"><div style="width:${Math.round(amt/maxCat*100)}%"></div></span>
      <span class="amt">${money(amt)}</span></div>
  `).join("") : `<p class="empty">No expenses recorded yet.</p>`;

  const recent = [...data.txns].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6);
  $("recentList").innerHTML = recent.length ? recent.map(t=>`
    <li><div class="grow"><b>${esc(t.desc)}</b><span>${esc(t.category)} · ${fmtDate(t.date)}</span></div>
    <span class="${t.type==="Income"?"amt-in":"amt-out"}">${t.type==="Income"?"+":"-"}${money(t.amount)}</span></li>
  `).join("") : `<li class="empty">No transactions yet.</li>`;
}

function renderTxns(){
  const q = $("searchTxn").value.trim().toLowerCase();
  const type = $("filterType").value;
  const category = $("filterCategory").value;
  $("filterCategory").innerHTML = `<option value="">All categories</option>` +
    [...new Set(data.txns.map(t=>t.category))].map(c=>`<option ${c===category?"selected":""}>${esc(c)}</option>`).join("");

  const rows = data.txns.filter(t=>
    (t.desc+" "+t.category).toLowerCase().includes(q) &&
    (!type || t.type===type) && (!category || t.category===category)
  ).sort((a,b)=>b.date.localeCompare(a.date));

  $("txnBody").innerHTML = rows.length ? rows.map(t=>`<tr>
      <td>${fmtDate(t.date)}</td><td>${esc(t.desc)}</td><td>${esc(t.category)}</td>
      <td><span class="badge ${t.type}">${t.type}</span></td>
      <td class="${t.type==="Income"?"amt-in":"amt-out"}">${t.type==="Income"?"+":"-"}${money(t.amount)}</td>
      <td><button class="small" data-edit="${t.id}">Edit</button><button class="small del" data-del="${t.id}">Delete</button></td>
    </tr>`).join("") : `<tr><td colspan="6" class="empty">No transactions found.</td></tr>`;
}

$("txnBody").addEventListener("click", e=>{
  const t = e.target;
  if (t.dataset.edit) openForm(data.txns.find(x=>x.id==t.dataset.edit));
  if (t.dataset.del && confirm("Delete this transaction?")){
    data.txns = data.txns.filter(x=>x.id!=t.dataset.del);
    save(); renderAll(); toast("Transaction deleted");
  }
});
$("searchTxn").addEventListener("input", renderTxns);
$("filterType").addEventListener("change", renderTxns);
$("filterCategory").addEventListener("change", renderTxns);

function renderAll(){ renderDashboard(); renderTxns(); }
$("f_category").innerHTML = catOptions("Expense").map(c=>`<option>${c}</option>`).join("");
renderAll();
