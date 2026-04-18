import socket
import sys

def check_port(port):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.bind(("0.0.0.0", port))
        print(f"✅ Port {port} is AVAILABLE for binding.")
        return True
    except socket.error as e:
        print(f"❌ Port {port} is BUSY or RESTRICTED: {e}")
        return False
    finally:
        s.close()

if __name__ == "__main__":
    check_port(8125)
