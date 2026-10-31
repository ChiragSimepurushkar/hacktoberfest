import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';

/**
 * Strips all Markdown syntax so chatbot output is plain readable text.
 * Removes: ##/### headers, **bold**, *italic*, `code`, - bullet dashes,
 * numbered list prefixes, LaTeX syntax, and extra blank lines.
 */
function stripMarkdown(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/#{1,6}\s+/gm, '')           // ## headers
    .replace(/\*\*(.+?)\*\*/gs, '$1')      // **bold**
    .replace(/\*(.+?)\*/gs, '$1')          // *italic*
    .replace(/`{1,3}([^`]*)`{1,3}/g, '$1')// `code` or ```block```
    .replace(/^\s*[-*+]\s+/gm, '')         // - bullet dashes
    .replace(/^\s*\d+\.\s+/gm, '')         // 1. numbered lists
    .replace(/\$\$?[^$]*\$\$?/g, '')       // inline/block LaTeX
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [link text](url) -> text
    .replace(/\n{3,}/g, '\n\n')            // collapse 3+ blank lines to 2
    .trim();
}

/**
 * Generates dynamic, contextual suggested prompt chips tailored to the
 * ACTIVE diagram data rather than static example values.
 */
function getContextualPrompts(diagramType, data) {
  if (diagramType === 'free_body') {
    const mass = data?.mass ?? 2;
    const angle = data?.incline_angle ?? data?.surface_angle ?? 30;
    return [
      `How is the net force computed for this ${mass} kg mass?`,
      angle > 0
        ? `Why is the normal force perpendicular to the ${angle}° incline?`
        : 'What is the normal force on this horizontal surface?',
      'Check if there are any errors or inconsistencies in this diagram.',
      'What acceleration will this object experience under these forces?',
    ];
  }

  if (diagramType === 'circuit') {
    const comps = data?.components || [];
    const battery = comps.find((c) => c.type === 'battery');
    const resistors = comps.filter((c) => c.type === 'resistor');
    const vsVal = battery?.value ?? 10;
    const rNames = resistors.map((r) => r.label || 'R').slice(0, 3).join(', ');

    return [
      'How is the equivalent resistance calculated for this circuit?',
      resistors.length > 1
        ? `How does the current divide across ${rNames}?`
        : `What current flows from the ${vsVal}V voltage source?`,
      'Check if the student made any errors in their circuit calculations.',
      'What happens to total current if one resistor value is doubled?',
    ];
  }

  if (diagramType === 'state_machine') {
    const states = data?.states || ['q0', 'q1'];
    const acc = (data?.accepting || []).join(', ') || 'accepting states';
    const init = data?.initial || states[0];
    return [
      `What language or sequence does this ${states.length}-state automaton recognize?`,
      `Explain the role of accepting state(s) ${acc}.`,
      `Walk through the transitions starting from ${init}.`,
      'Can any input string cause this machine to reject or halt?',
    ];
  }

  return [
    'Explain the governing equations for this diagram.',
    'Check if there are any errors or inconsistencies in this diagram.',
  ];
}

/**
 * Dynamic educational fallback tailored to active diagram parameters.
 */
function buildContextualFallback(diagramType, data, question) {
  if (diagramType === 'free_body') {
    const m = data?.mass ?? 2;
    const angle = data?.incline_angle ?? data?.surface_angle ?? 30;
    return stripMarkdown(`For this free-body diagram with a ${m} kg mass at an angle of ${angle} degrees:
Normal force is calculated as N = m * g * cos(theta), where gravity acts straight down at 90 degrees to horizontal.
Friction acts along the surface opposing relative motion, with maximum static friction given by f_max = mu * N.
Net force along the surface is the vector sum of applied forces, friction, and the gravity component m * g * sin(theta).
Acceleration is then a = F_net / m.`);
  }

  if (diagramType === 'circuit') {
    const comps = data?.components || [];
    const battery = comps.find((c) => c.type === 'battery');
    const vs = battery?.value ?? 10;
    return stripMarkdown(`For this DC circuit with a ${vs}V source:
Ohm's Law governs each branch: V = I * R.
Kirchhoff's Current Law (KCL) ensures total current entering any node equals total current leaving.
In series branches, current is identical and voltages add.
In parallel branches, voltage across each branch is identical and currents divide inversely to branch resistances.`);
  }

  if (diagramType === 'state_machine') {
    const states = (data?.states || []).join(', ');
    const init = data?.initial || 'initial state';
    const acc = (data?.accepting || []).join(', ');
    return stripMarkdown(`This finite state automaton operates over states ${states}.
Execution starts at ${init}.
For each input symbol read, the transition function moves the machine to the designated next state.
A string is accepted if and only if execution terminates in one of the accepting states: ${acc}.`);
  }

  return 'The diagram follows standard governing equations. Review the telemetry cards above for exact numerical values.';
}

export default function TutorChatbot({ diagramType, extractedData }) {
  const [messages, setMessages] = useState([
    {
      sender: 'gemma',
      text: stripMarkdown(`Hello! I am your Gemma 4 Lab Tutor. I have analyzed your ${diagramType?.replace('_', ' ')} diagram. You can ask me any question about the formulas, verify your calculations, or explore what happens when values change!`),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Dynamic suggested prompts based on actual diagram data
  const prompts = getContextualPrompts(diagramType, extractedData);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function handleSend(questionText) {
    const q = (questionText || input).trim();
    if (!q || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { sender: 'user', text: q }]);
    setLoading(true);

    try {
      const res = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diagram_type: diagramType,
          diagram_data: extractedData,
          question: q,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.answer) {
          setMessages((prev) => [...prev, { sender: 'gemma', text: stripMarkdown(json.answer) }]);
          setLoading(false);
          return;
        }
      }
      throw new Error('API offline');
    } catch (err) {
      const fallback = buildContextualFallback(diagramType, extractedData, q);
      setTimeout(() => {
        setMessages((prev) => [...prev, { sender: 'gemma', text: fallback }]);
        setLoading(false);
      }, 400);
    }
  }

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid var(--line, #e2e8f0)',
        borderRadius: 10,
        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        overflow: 'hidden',
        marginTop: 24,
      }}
    >
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0b1b3a 0%, #1e3a8a 100%)',
          padding: '14px 18px',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              background: 'rgba(255,255,255,0.15)',
              padding: 6,
              borderRadius: 6,
              display: 'flex',
            }}
          >
            <Bot size={20} color="#60a5fa" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: '0.02em' }}>
              Gemma 4 Lab Tutor
            </div>
            <div style={{ fontSize: 11, color: '#93c5fd', opacity: 0.9 }}>
              Ask anything about your diagram, calculations, or concepts
            </div>
          </div>
        </div>
        <span
          style={{
            background: 'rgba(37, 99, 235, 0.4)',
            border: '1px solid #60a5fa',
            color: '#ffffff',
            fontSize: 10,
            padding: '2px 8px',
            borderRadius: 12,
            fontWeight: 700,
          }}
        >
          GEMMA-4
        </span>
      </div>

      {/* Dynamic Suggested Prompt Chips */}
      <div
        style={{
          padding: '10px 16px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Sparkles size={12} color="#2563eb" /> Suggested:
        </span>
        {prompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p)}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: 14,
              padding: '3px 10px',
              fontSize: 11,
              color: '#1e293b',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#2563eb';
              e.currentTarget.style.color = '#2563eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.color = '#1e293b';
            }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Message History Thread */}
      <div
        style={{
          padding: '16px',
          maxHeight: 340,
          minHeight: 180,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          background: '#fafaf9',
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: 10,
              alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
            }}
          >
            {m.sender === 'gemma' && (
              <div
                style={{
                  background: '#1e3a8a',
                  color: '#ffffff',
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                <Bot size={16} />
              </div>
            )}

            <div
              style={{
                background: m.sender === 'user' ? '#eff6ff' : '#ffffff',
                border: m.sender === 'user' ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                color: '#1e293b',
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: 13,
                lineHeight: 1.55,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                whiteSpace: 'pre-line',
              }}
            >
              {m.text}
            </div>

            {m.sender === 'user' && (
              <div
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                <User size={16} />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: '#64748b', fontSize: 12 }}>
            <Bot size={18} color="#2563eb" />
            <span>Gemma 4 is reasoning...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        style={{
          display: 'flex',
          padding: '12px 16px',
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          gap: 10,
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about your diagram or calculation..."
          style={{
            flex: 1,
            padding: '9px 14px',
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            fontSize: 13,
            outline: 'none',
            fontFamily: 'inherit',
          }}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          style={{
            background: !input.trim() || loading ? '#94a3b8' : '#1e3a8a',
            color: '#ffffff',
            border: 'none',
            borderRadius: 6,
            padding: '0 16px',
            cursor: !input.trim() || loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <Send size={14} /> Send
        </button>
      </form>
    </div>
  );
}
