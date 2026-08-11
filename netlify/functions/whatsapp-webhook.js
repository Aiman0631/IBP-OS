const { createClient } = require('@supabase/supabase-js');
exports.handler = async (event) => {
  if(event.httpMethod==='GET'){
    const p=event.queryStringParameters||{};
    return p['hub.verify_token']===process.env.WHATSAPP_VERIFY_TOKEN ? {statusCode:200,body:p['hub.challenge']||''}:{statusCode:403,body:'Forbidden'};
  }
  if(event.httpMethod!=='POST') return {statusCode:405,body:'Method Not Allowed'};
  try{
    const payload=JSON.parse(event.body||'{}'), value=payload.entry?.[0]?.changes?.[0]?.value, messages=value?.messages||[];
    if(!messages.length) return {statusCode:200,body:'EVENT_RECEIVED'};
    const supabase=createClient(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);
    for(const msg of messages){
      const phone=msg.from, body=msg.text?.body||msg.button?.text||'[Media message]';
      let {data:lead}=await supabase.from('leads').select('id,name').eq('phone',phone).maybeSingle();
      if(!lead){const r=await supabase.from('leads').insert({name:phone,phone,source:'WhatsApp',status:'New',score:50,last_message:body}).select('id,name').single(); if(r.error) throw r.error; lead=r.data;}
      else await supabase.from('leads').update({last_message:body,updated_at:new Date().toISOString()}).eq('id',lead.id);
      await supabase.from('messages').insert({lead_id:lead.id,wa_message_id:msg.id,direction:'inbound',body,status:'received'});
    }
    return {statusCode:200,body:'EVENT_RECEIVED'};
  }catch(e){return {statusCode:500,body:JSON.stringify({error:e.message})};}
};