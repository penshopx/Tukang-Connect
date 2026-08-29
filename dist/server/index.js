import { app } from "./app.js";
import { startupReady } from "./storage.js";
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
// Await seed + password migration before accepting traffic so no user
// is served a login failure while their row is still being migrated.
startupReady.then(() => {
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
});
