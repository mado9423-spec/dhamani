// This endpoint has been retired. The insecure name+pension+branch login
// (guessable, no secret) was replaced by citizen-auth (PIN + branch activation).
// Kept as a disabled stub instead of a hard delete, and now requires a valid
// JWT so it can never be invoked anonymously.
Deno.serve(async () => {
  return new Response(
    JSON.stringify({ error: "تم إيقاف هذا المسار نهائياً" }),
    { status: 410, headers: { "Content-Type": "application/json" } }
  );
});
