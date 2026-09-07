import copy
import datetime as dt
import importlib.util
import pathlib
import unittest

spec = importlib.util.spec_from_file_location("preflight", pathlib.Path(__file__).resolve().parents[2] / "scripts/ios-signing-preflight.py")
preflight = importlib.util.module_from_spec(spec)
spec.loader.exec_module(preflight)

class SigningPreflightTests(unittest.TestCase):
    def setUp(self):
        self.env = {"APPLE_TEAM_ID": "TESTTEAM12", "IOS_CERTIFICATE_BASE64": "fixture", "IOS_P12_PASSWORD": "fixture", "IOS_PROFILE_BASE64": "fixture", "RC_SHA": "a" * 40, "BUILD_NUMBER": "1", "UPLOAD_TESTFLIGHT": "false"}
        self.profile = {"UUID": "12345678-1234-1234-1234-123456789abc", "TeamIdentifier": ["TESTTEAM12"], "ExpirationDate": dt.datetime(2030, 1, 1), "Entitlements": {"application-identifier": "TESTTEAM12." + preflight.BUNDLE, "com.apple.developer.team-identifier": "TESTTEAM12", "get-task-allow": False}, "DeveloperCertificates": [b"synthetic certificate"]}

    def test_archive_does_not_require_upload_key(self):
        self.assertFalse(preflight.check_config(self.env)["uploadRequested"])

    def test_upload_requires_all_key_parts_without_echoing_values(self):
        self.env["UPLOAD_TESTFLIGHT"] = "true"
        with self.assertRaisesRegex(ValueError, "ASC_KEY_ID, ASC_ISSUER_ID, ASC_PRIVATE_KEY_BASE64"):
            preflight.check_config(self.env)

    def test_rejects_invalid_commit_build_team_and_mode(self):
        for key, value in [("RC_SHA", "main"), ("BUILD_NUMBER", "0"), ("BUILD_NUMBER", "1;echo x"), ("APPLE_TEAM_ID", "bad"), ("UPLOAD_TESTFLIGHT", "yes")]:
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                preflight.check_config({**self.env, key: value})

    def test_accepts_matching_store_profile(self):
        self.assertEqual(preflight.check_profile(self.profile, "TESTTEAM12")["bundleId"], preflight.BUNDLE)

    def test_rejects_wrong_team_wildcard_debug_adhoc_enterprise_and_expiration(self):
        variants = [{"TeamIdentifier": ["OTHERTEAM1"]}, {"ExpirationDate": dt.datetime(2000, 1, 1)}, {"ProvisionedDevices": []}, {"ProvisionsAllDevices": True}, {"DeveloperCertificates": []}, {"UUID": "../../profile"}]
        for changes in variants:
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                preflight.check_profile({**self.profile, **changes}, "TESTTEAM12")
        for key, value in [("application-identifier", "TESTTEAM12.*"), ("get-task-allow", True), ("get-task-allow", None), ("com.apple.developer.team-identifier", "OTHERTEAM1")]:
            p = copy.deepcopy(self.profile)
            p["Entitlements"][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                preflight.check_profile(p, "TESTTEAM12")

if __name__ == "__main__":
    unittest.main()
