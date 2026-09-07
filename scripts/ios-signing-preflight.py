"""Fail before signing on missing input, wrong app/team, or non-store profiles."""
import datetime as dt
import hashlib
import json
import os
import pathlib
import plistlib
import re
import sys

BUNDLE = "com.embroiderycalc.companion"

def check_config(env):
    required = ["APPLE_TEAM_ID", "IOS_CERTIFICATE_BASE64", "IOS_P12_PASSWORD", "IOS_PROFILE_BASE64", "RC_SHA", "BUILD_NUMBER"]
    if env.get("UPLOAD_TESTFLIGHT") == "true":
        required += ["ASC_KEY_ID", "ASC_ISSUER_ID", "ASC_PRIVATE_KEY_BASE64"]
    missing = [key for key in required if not env.get(key)]
    if missing:
        raise ValueError("Missing secure configuration: " + ", ".join(missing))
    if not re.fullmatch(r"[A-Z0-9]{10}", env["APPLE_TEAM_ID"]):
        raise ValueError("APPLE_TEAM_ID must contain ten uppercase letters/digits")
    if not re.fullmatch(r"[0-9a-f]{40}", env["RC_SHA"]):
        raise ValueError("RC_SHA must be the reviewed 40-character commit SHA")
    if not re.fullmatch(r"[1-9][0-9]{0,3}", env["BUILD_NUMBER"]):
        raise ValueError("BUILD_NUMBER must be a new integer from 1 to 9999")
    if env.get("UPLOAD_TESTFLIGHT", "false") not in ("true", "false"):
        raise ValueError("UPLOAD_TESTFLIGHT must be true or false")
    return {"bundleId": BUNDLE, "commit": env["RC_SHA"], "build": env["BUILD_NUMBER"],
            "uploadRequested": env.get("UPLOAD_TESTFLIGHT") == "true", "configuration": "present"}

def check_profile(profile, team, now=None):
    now = now or dt.datetime.now(dt.timezone.utc)
    expiration = profile.get("ExpirationDate")
    if not isinstance(expiration, dt.datetime) or expiration.replace(tzinfo=dt.timezone.utc) <= now:
        raise ValueError("Provisioning profile has expired or has no expiration")
    if profile.get("TeamIdentifier") != [team]:
        raise ValueError("Provisioning profile belongs to another team")
    entitlements = profile.get("Entitlements", {})
    if entitlements.get("application-identifier") != team + "." + BUNDLE:
        raise ValueError("Provisioning profile does not match the exact app identifier")
    if entitlements.get("com.apple.developer.team-identifier") != team:
        raise ValueError("Provisioning profile entitlement team does not match")
    if entitlements.get("get-task-allow") is not False or "ProvisionedDevices" in profile or profile.get("ProvisionsAllDevices"):
        raise ValueError("Requires an App Store Connect distribution profile")
    uuid = profile.get("UUID", "")
    if not re.fullmatch(r"[A-Fa-f0-9-]{36}", uuid):
        raise ValueError("Invalid provisioning profile UUID")
    certificates = profile.get("DeveloperCertificates", [])
    if len(certificates) != 1 or not isinstance(certificates[0], bytes):
        raise ValueError("Expected one App Store distribution certificate")
    return {"uuid": uuid, "certificateSHA1": hashlib.sha1(certificates[0]).hexdigest().upper(),
            "expires": expiration.isoformat(), "bundleId": BUNDLE}

if __name__ == "__main__":
    try:
        if len(sys.argv) == 1:
            report = check_config(os.environ)
        else:
            report = check_profile(plistlib.loads(pathlib.Path(sys.argv[1]).read_bytes()), os.environ["APPLE_TEAM_ID"])
        print(json.dumps(report, indent=2))
    except (ValueError, KeyError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
