exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    const { lead = {}, task = 'qualify', conversation = [] } = JSON.parse(event.body || '{}');
    if (!process.env.OPENAI_API_KEY) return { statusCode: 200, headers: {'Content-Type':'application/json'}, body: JSON.stringify({demo:true,result:demo(task,lead)}) };
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.OPENAI_API_KEY}`},
      body:JSON.stringify({model:'gpt-4o-mini',temperature:.4,messages:[
        {role:'system',content:'You are LeadFlow AI, a concise sales assistant. Qualify leads, identify buying intent, suggest next actions, and draft natural WhatsApp replies. Never invent facts.'},
        {role:'user',content:`Task: ${task}\nLead: ${JSON.stringify(lead)}\nConversation: ${JSON.stringify(conversation)}\nGive a practical sales answer.`}
      ]})
    });
    const data=await response.json();
    return {statusCode:response.status,headers:{'Content-Type':'application/json'},body:JSON.stringify({result:data.choices?.[0]?.message?.content||data.error?.message||''})};
  } catch(e){ return {statusCode:500,body:JSON.stringify({error:e.message})}; }
};
function demo(task,lead){
 if(task==='reply') return `Hi ${lead.name||'there'}, thanks for reaching out. I can help with the next step. Would you like me to send the details and timeline here?`;
 if(task==='next_step') return `Follow up while buying intent is fresh. Confirm the requirement, decision timeline and approval process, then move the lead toward a concrete proposal.`;
 return `Lead score: ${lead.score??'—'}/100. ${lead.score>=80?'High intent — move toward a proposal and confirm the decision date.':'Moderate intent — ask one focused question to uncover the main blocker.'}`;
}