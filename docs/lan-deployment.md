# LAN deployment

Target: `adria@192.168.1.146`. Authentication uses SSH; passwords are never
stored in the repository.

```bash
sh scripts/deploy-lan.sh
```

This copies application code and installs runtime dependencies, preserving
remote `data/`, `.env` files and `labbook.config.json`. It installs a systemd
entry-point override for `src/server/server.cjs`, preserves other service
settings and restarts the `lab-book` systemd service
and checks its health. SSH and sudo authentication may be requested.
Future deployments never copy the local database over the remote database.

For LAN access, start the production server with:

```bash
HOST=0.0.0.0 NODE_ENV=production PORT=4173 npm start
```

`HOST` defaults to loopback for local development. Initial desired addresses:
`http://192.168.1.146:4173` and `http://lab-book.local:4173`.
The `.local` hostname requires a running mDNS responder on the destination
(typically Avahi on Linux or Bonjour on macOS). It must be configured on that
host; changing this project's files does not register an mDNS hostname.

The destination runs Debian on ARM64. Production is managed by the system
service `lab-book`, running as `adria` from `/home/adria/lab-book`. It starts
at boot. Nginx proxies `http://lab-book.local` to localhost:4173; the existing
Nginx site remains enabled. The `lab-book-mdns` system service uses Avahi to
announce `lab-book.local` without replacing the server's existing hostname.
The address assumes the server keeps 192.168.1.146 on the LAN.

Nginx also listens on port 8080 for direct access at
`http://192.168.1.146:8080` if a client cannot resolve mDNS names.
`deploy/lab-book-avahi.service` advertises the website as an HTTP service.

Service and proxy definitions are in `deploy/`. Set server-side secrets in
`/home/adria/.config/lab-book/environment` (mode 600), then restart the service.
Neither the SSH password nor API keys are stored in the repository.
