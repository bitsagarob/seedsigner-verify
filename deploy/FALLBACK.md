# Fallback: moving to GitHub Pages

Not in use. This exists so that moving is a ten minute job rather than a project, and so that
anyone auditing the site can see the escape route is real.

DNS for bitsaga.be stays under our control, so switching hosts is one record change.

## Why we are not on Pages today

Pages provides no server logs, which would mean no measurement of the site at all, ever. Serving
from our own nginx lets us import access logs into Matomo, which needs no script on the page, no
cookies and no consent banner. The page still loads nothing from any other server.

The tradeoff is honest: our VPS runs other services and therefore has a larger attack surface
than a GitHub Pages account. What compensates is that the source and the signed manifest live on
GitHub while the site is served from our box, so changing what a visitor receives without leaving
a trace requires compromising both.

## If GitHub ever becomes the better option

1. In the repository, add a file `CNAME` containing exactly one line: `verify.bitsaga.be`.
2. Settings, Pages, Build and deployment, Source "Deploy from a branch", Branch `main`, folder
   `/ (root)`. Save.
3. At the DNS provider for bitsaga.be, change the `verify` record from an A record pointing at
   the VPS to a CNAME pointing at `bitsagarob.github.io`.
4. Wait a few minutes, reload Settings, Pages until the custom domain shows a green check, then
   tick Enforce HTTPS. The certificate appears automatically and can take up to an hour.
5. Retire the nginx server block on the VPS.

Everything else works unchanged. Asset paths are relative throughout, so the same files serve
correctly from a subpath as well, which also means the site can be mirrored at
`bitsagarob.github.io/seedsigner-verify` alongside the main one without modification.

The meta Content-Security-Policy in `index.html` is there precisely for this case, since Pages
cannot set custom headers. The nginx config sets the same policy as a real header.

## If both are unavailable

The repository is the deployment. Any static host works, including a laptop:

```
git clone https://github.com/bitsagarob/seedsigner-verify
cd seedsigner-verify
python3 -m http.server 8000
```

Verify what you got against the signed manifest first. See README.md.
