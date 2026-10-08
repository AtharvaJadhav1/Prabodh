/**
 * WhatsApp-style system note at the top of a 1:1 thread. Honest wording: direct messages are encrypted in the
 * database, but this is NOT end-to-end encryption (the server can decrypt them). Never render it for group chats.
 */
export default function EncryptionNote({ app = false }: { app?: boolean }) {
  return (
    <div role="note" className="my-2 flex justify-center px-1">
      <p
        className={
          "flex max-w-[22rem] items-start gap-2 rounded-xl px-3 py-2 text-center text-[12px] font-medium leading-snug shadow-[0_1px_1px_rgba(0,0,0,0.08)] " +
          (app ? "bg-chat-brandSoft text-chat-brandText" : "bg-brand-lightOrange text-brand-deep")
        }
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true">
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 018 0v3" />
        </svg>
        <span className="min-w-0 break-words">Messages in this chat are encrypted and stored securely.</span>
      </p>
    </div>
  );
}
