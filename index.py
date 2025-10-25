from flask import Flask, request, jsonify
import requests
import json

# --- Configuration ---
HALFBLOOD_URL = "https://halfblood.famapp.in/vpa/verifyExt"
RAZORPAY_IFSC_URL = "https://ifsc.razorpay.com/"

HEADERS = {
    'User-Agent': "A015 | Android 15 | Dalvik/2.1.0 | Tetris | 318D0D6589676E17F88CCE03A86C2591C8EBAFBA |  (Build -1) | 3DB5HIEMMG",
    'Accept': "application/json",
    'Content-Type': "application/json",
    'authorization': "Token eyJlbmMiOiJBMjU2Q0JDLUhTNTEyIiwiZXBrIjp7Imt0eSI6Ik9LUCIsImNydiI6Ilg0NDgiLCJ4IjoiZldEV2hlWTRyUXZRdzJQT0NCWWJpcFN6ZmJaczFPZFktWGcwZ25ORFV4VDVVNnV3TjhCLUw0Rm9PU1JQMGhKWVoyX1FiTnJqQ0s0In0sImFsZyI6IkVDREgtRVMifQ..YomDRfMtMXcQvvY5zqo1Rw.hgxy4MfXnzkqq8Xc31sYov9ggEovQJ7CebQnmeQ1RnyJBy52kHi_1kcEwX82oYZIuQaZ8FFSqIqCoIxrVJrqQflHF_ZjaU4lhwcoAV-l2_9vMjMe31FpZ9iXe56SxIGi3wEIDDyMnzWYW8N41An_srXEXj-y5nI-p1k4NEh_Ld0QwtLW4oR0NWJjySEhaeJy09H3EEZ9paJmlJPK2fKpaQ0k7eBKq6Ltib_l7kMmSJ5V7qnl5FX20mz-0IjkSa3BIOvfrkQg_TrzjzGg3l7B7g.QdQj098-_lKf08lxXEL3raDrj6gHHEYQjMAJ_7W1mPo"
}

# ✅ Allowed API Keys
ALLOWED_KEYS = {
    "notfirnkanshs": "Free User",
    "456": "Premium User",
    "keyNever019191": "Admin",
    "shaurya": "Admin"
}

app = Flask(__name__)


def check_api_key(req):
    api_key = req.headers.get("x-api-key") or req.args.get("key")
    if not api_key:
        return False, "Missing API key"
    if api_key not in ALLOWED_KEYS:
        return False, "Invalid API key"
    return True, ALLOWED_KEYS[api_key]


def fetch_and_chain(upi_id):
    payload = {"upi_string": f"upi://pay?pa={upi_id}"}

    try:
        res_vpa = requests.post(HALFBLOOD_URL, json=payload, headers=HEADERS, timeout=10)
        res_vpa.raise_for_status()

        vpa_info = res_vpa.json().get("data", {}).get("verify_vpa_resp", {})
        if not vpa_info:
            return {"error": "No VPA data found"}, 404

        vpa_details = {
            "name": vpa_info.get("name"),
            "vpa": vpa_info.get("vpa"),
            "ifsc": vpa_info.get("ifsc")
        }

        final_output = {"vpa_details": vpa_details}

        if vpa_details.get("ifsc"):
            try:
                res_ifsc = requests.get(f"{RAZORPAY_IFSC_URL}{vpa_details['ifsc']}", timeout=10)
                final_output["bank_details_raw"] = res_ifsc.json()
            except:
                final_output["bank_details_raw"] = {"warning": "Bank lookup failed"}

        return final_output, 200

    except requests.exceptions.RequestException as e:
        return {"error": str(e)}, 500


@app.route("/api/upi", methods=["GET"])
def api_upi_lookup():
    is_valid, msg = check_api_key(request)
    if not is_valid:
        return jsonify({"error": msg}), 403

    upi_id = request.args.get("upi_id")
    if not upi_id:
        return jsonify({"error": "Missing required parameter: upi_id"}), 400

    result, status = fetch_and_chain(upi_id)
    return jsonify(result), status


# ✅ Vercel Support
app = app
