#!/usr/bin/env python3
"""Verify the Electrum-format Bitcoin message signature on the 3rdIteration
SeedSigner smartcard release checksums. Pure stdlib, no dependencies, so it can
be read and re-run by anyone. Written for VERIFICATION_LOG.md.

Usage: python3 verify_btc_msg.py <release-body.txt>
"""
import base64
import hashlib
import json
import sys

# secp256k1
P = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F
N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
GX = 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798
GY = 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8

B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"


def inv(a, m=P):
    return pow(a, m - 2, m)


def add(p, q):
    if p is None:
        return q
    if q is None:
        return p
    if p[0] == q[0] and (p[1] + q[1]) % P == 0:
        return None
    if p == q:
        lam = 3 * p[0] * p[0] % P * inv(2 * p[1] % P) % P
    else:
        lam = (q[1] - p[1]) % P * inv((q[0] - p[0]) % P) % P
    x = (lam * lam - p[0] - q[0]) % P
    return (x, (lam * (p[0] - x) - p[1]) % P)


def mul(k, p):
    r = None
    while k:
        if k & 1:
            r = add(r, p)
        p = add(p, p)
        k >>= 1
    return r


def hash160(b):
    return hashlib.new("ripemd160", hashlib.sha256(b).digest()).digest()


def b58check(payload):
    chk = hashlib.sha256(hashlib.sha256(payload).digest()).digest()[:4]
    n = int.from_bytes(payload + chk, "big")
    out = ""
    while n:
        n, r = divmod(n, 58)
        out = B58[r] + out
    return "1" * (len(payload + chk) - len((payload + chk).lstrip(b"\0"))) + out


def varint(n):
    if n < 0xFD:
        return bytes([n])
    if n <= 0xFFFF:
        return b"\xfd" + n.to_bytes(2, "little")
    return b"\xfe" + n.to_bytes(4, "little")


def msg_hash(message: bytes):
    data = b"\x18Bitcoin Signed Message:\n" + varint(len(message)) + message
    return hashlib.sha256(hashlib.sha256(data).digest()).digest()


def recover(msghash, sig_b64):
    sig = base64.b64decode(sig_b64)
    if len(sig) != 65:
        raise ValueError(f"signature is {len(sig)} bytes, expected 65")
    header = sig[0]
    r = int.from_bytes(sig[1:33], "big")
    s = int.from_bytes(sig[33:65], "big")
    recid = (header - 27) & 3
    e = int.from_bytes(msghash, "big")
    x = r + (recid >> 1) * N
    # decompress R
    alpha = (pow(x, 3, P) + 7) % P
    beta = pow(alpha, (P + 1) // 4, P)
    y = beta if (beta % 2 == recid & 1) else P - beta
    R = (x, y)
    rinv = inv(r, N)
    Q = mul(rinv * s % N, R)
    Q = add(Q, mul(N - rinv * e % N, (GX, GY)))
    return header, Q


def pubkeys(Q):
    comp = bytes([2 + (Q[1] & 1)]) + Q[0].to_bytes(32, "big")
    uncomp = b"\x04" + Q[0].to_bytes(32, "big") + Q[1].to_bytes(32, "big")
    return comp, uncomp


def addresses(Q):
    comp, uncomp = pubkeys(Q)
    out = {}
    out["p2pkh-compressed"] = b58check(b"\x00" + hash160(comp))
    out["p2pkh-uncompressed"] = b58check(b"\x00" + hash160(uncomp))
    redeem = b"\x00\x14" + hash160(comp)
    out["p2sh-p2wpkh"] = b58check(b"\x05" + hash160(redeem))
    return out


def main():
    body = open(sys.argv[1], "rb").read().decode("utf-8")
    expected_addr = "37hiiSB1Poj6Shs8WawPS2HjT2jzHkFSQi"
    sig = "IDS9imBk642PtjkbND22ioVUh79KPIWmCQXQG021Es76Ja6ZQ/FJHrLRO+NoJ2IZZghQnvsJABTfiX8o479VVD0="

    # The signed message is the checksum block between the dashed separator lines.
    norm = body.replace("\r\n", "\n")
    sep = "- - - - - - - - - - - - - - - - - - - - - - - - "
    parts = norm.split(sep)
    if len(parts) < 3:
        print("could not locate the separator lines")
        return 1
    block = parts[1]

    candidates = {
        "between separators, stripped": block.strip(),
        "between separators, verbatim": block,
        "stripped + trailing LF": block.strip() + "\n",
        "stripped, CRLF line endings": block.strip().replace("\n", "\r\n"),
        "stripped, CRLF + trailing CRLF": block.strip().replace("\n", "\r\n") + "\r\n",
    }

    for label, msg in candidates.items():
        try:
            header, Q = recover(msg_hash(msg.encode()), sig)
            addrs = addresses(Q)
        except Exception as exc:
            print(f"[  ] {label}: {exc}")
            continue
        hit = [k for k, v in addrs.items() if v == expected_addr]
        mark = "OK" if hit else "  "
        print(f"[{mark}] {label}: header={header} -> {json.dumps(addrs, indent=6)}")
        if hit:
            print(f"\nMATCH as {hit[0]} against {expected_addr}")
            print(f"message was {len(msg.encode())} bytes")
            return 0
    print("\nNO MATCH with any framing tried")
    return 1


if __name__ == "__main__":
    sys.exit(main())
