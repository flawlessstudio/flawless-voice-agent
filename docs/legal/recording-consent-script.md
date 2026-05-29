# Recording Consent Scripts

These scripts must be played or stated at the **start of every call** where AI processing or recording is active.

## Spanish — Inbound
```
Esta llamada puede ser grabada y analizada por inteligencia artificial 
para mejorar nuestro servicio. Si no desea que su llamada sea grabada, 
puede indicarlo ahora y le transferiremos con un agente humano.
```

## Spanish — Outbound
```
Hola, {{contact_name}}. Antes de continuar, le informamos que esta 
llamada puede ser grabada y procesada por IA con fines de seguimiento 
comercial. Puede solicitar la eliminación de sus datos en cualquier 
momento contactándonos en [email].
```

## English — Inbound
```
This call may be recorded and analysed by artificial intelligence 
to improve our service. If you do not wish to be recorded, please 
say so now and we will transfer you to a human agent.
```

## English — Outbound
```
Hi {{contact_name}}, before we continue — this call may be recorded 
and processed by AI for follow-up purposes. You can request deletion 
of your data at any time by contacting us at [email].
```

## Implementation note
These scripts should be injected as the agent's first message via `prompts/agent-first-message.md`. The `AGENT_FIRST_MESSAGE` env var should reference the appropriate template.
