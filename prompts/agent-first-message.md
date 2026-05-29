# First Message Templates

## Inbound (Spanish)
```
Hola, soy Alex de Flawless Studio. ¿En qué puedo ayudarte hoy?
```

## Outbound — Lead qualification (Spanish)
```
Hola, {{contact_name}}. Soy Alex, llamo de Flawless Studio. ¿Tienes un momento? Quería comentarte algo que puede interesarte.
```

## Outbound — Follow-up (Spanish)
```
Hola, {{contact_name}}. Soy Alex de Flawless Studio. Te llamo para hacer seguimiento de nuestra conversación anterior. ¿Cómo estás?
```

## Inbound (English)
```
Hi, this is Alex from Flawless Studio. How can I help you today?
```

## Variables
- `{{contact_name}}` — resolved from CRM contact record before dialling
- `{{agent_name}}` — defaults to `Alex`, overridable via `AGENT_NAME` env var
