# Vendored CLI provenance

`version` and `upstreamCommit` identify the upstream CLI base. This bundle also includes the Mastercard strong-auth patches listed in `downstreamPatches`; `bundleSha256` verifies the resulting file.

The patches add capability validation, Visa/Mastercard Passkey URL selection, and strong-auth fields in checkout credentials. They preserve the upstream `instruction prepare` implementation.

When re-vendoring, build the desired upstream main Edition, reapply or merge these downstream changes, and run the vendor regression tests before updating the checksum. The upstream sync script updates version, commit and checksum metadata but does not replay these patches. Remove the downstream record only after the upstream source contains their equivalent behavior. Do not replace this bundle with a plain upstream build while retaining a stale patch declaration.
