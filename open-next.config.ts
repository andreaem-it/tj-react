import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// tj-react currently has no storage bindings. Use OpenNext's binding-free
// adapters so pull-request versions can be uploaded without provisioning or
// migrating production resources.
export default defineCloudflareConfig();
