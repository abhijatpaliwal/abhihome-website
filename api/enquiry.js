/**
 * api/enquiry.js - Vercel Serverless Function
 * Website trade enquiry -> Odoo CRM lead (crm.lead). Same Odoo env as api/apply.js:
 *   ODOO_URL, ODOO_DB, ODOO_USERNAME, ODOO_API_KEY
 */
module.exports.config = { api: { bodyParser: { sizeLimit: '1mb' } } };
function escXml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');}
function buildXmlRpc(method, params){
  function toXml(v){
    if(v===null||v===undefined) return '<value><boolean>0</boolean></value>';
    if(typeof v==='boolean') return '<value><boolean>'+(v?1:0)+'</boolean></value>';
    if(typeof v==='number'&&Number.isInteger(v)) return '<value><int>'+v+'</int></value>';
    if(typeof v==='string') return '<value><string>'+escXml(v)+'</string></value>';
    if(Array.isArray(v)) return '<value><array><data>'+v.map(toXml).join('')+'</data></array></value>';
    if(typeof v==='object'){return '<value><struct>'+Object.entries(v).map(function(e){return '<member><name>'+escXml(e[0])+'</name>'+toXml(e[1])+'</member>';}).join('')+'</struct></value>';}
    return '<value><string>'+escXml(String(v))+'</string></value>';
  }
  return '<?xml version="1.0"?><methodCall><methodName>'+method+'</methodName><params>'+params.map(function(p){return '<param>'+toXml(p)+'</param>';}).join('')+'</params></methodCall>';
}
function parseId(xml){
  var f=xml.match(/<fault>[\s\S]*?<\/fault>/);
  if(f){var m=xml.match(/<name>faultString<\/name>\s*<value><string>([\s\S]*?)<\/string>/);throw new Error('Odoo fault: '+(m?m[1]:'unknown'));}
  var i=xml.match(/<value><(?:int|i4)>(\d+)<\/(?:int|i4)><\/value>/);
  if(i) return parseInt(i[1],10);
  throw new Error('Bad XML-RPC response');
}
async function rpc(url,path,body){var r=await fetch(url+path,{method:'POST',headers:{'Content-Type':'text/xml','Accept':'text/xml'},body:body});if(!r.ok)throw new Error('Odoo HTTP '+r.status);return await r.text();}
module.exports = async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','https://www.abhihome.in');
  res.setHeader('Access-Control-Allow-Methods','POST'); res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(204).end();
  if(req.method!=='POST') return res.status(405).json({success:false,message:'Method not allowed.'});
  var U=process.env.ODOO_URL,D=process.env.ODOO_DB,N=process.env.ODOO_USERNAME,K=process.env.ODOO_API_KEY;
  if(!U||!D||!N||!K){console.error('Missing Odoo env vars');return res.status(500).json({success:false,message:'Server configuration error.'});}
  var b=req.body||{};
  if(b.company_website) return res.status(200).json({success:true}); // honeypot
  var name=(b.name||'').trim(),email=(b.email||'').trim(),company=(b.company||'').trim(),phone=(b.phone||'').trim(),country=(b.country||'').trim(),product=(b.product||'').trim(),message=(b.message||'').trim(),consent=(b.consent||'').toString().trim();
  if(!name||!email) return res.status(400).json({success:false,message:'Name and email are required.'});
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({success:false,message:'Please enter a valid email.'});
  var title='Website enquiry - '+(company||name)+(product?(' - '+product):'');
  var desc=[company&&('Company: '+company),country&&('Country: '+country),product&&('Product interest: '+product),phone&&('Phone: '+phone),message&&('Message:\n'+message),'',('Consent: '+(consent?('GIVEN - Privacy Policy accepted at '+new Date().toISOString()):'NOT PROVIDED')),'Source: Website Trade Enquiry (abhihome.in)'].filter(Boolean).join('\n');
  try{
    var uid=parseId(await rpc(U,'/xmlrpc/2/common',buildXmlRpc('authenticate',[D,N,K,{}])));
    if(!uid) throw new Error('Auth failed');
    var lead=parseId(await rpc(U,'/xmlrpc/2/object',buildXmlRpc('execute_kw',[D,uid,K,'crm.lead','create',[{name:title,contact_name:name,partner_name:(company||''),email_from:email,phone:phone,description:desc}],{}])));
    console.log('CRM lead '+lead+' - '+name+' ('+email+')');
    return res.status(200).json({success:true,leadId:lead});
  }catch(err){
    console.error('Odoo enquiry error:',err.message);
    return res.status(500).json({success:false,message:'We could not submit your enquiry right now. Please email info@abhihome.in and we will respond within 48 hours.'});
  }
}
