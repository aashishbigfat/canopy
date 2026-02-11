import os

def check_case(path):
    print(f"Checking directory: {path}")
    if not os.path.exists(path):
        print(f"Path does not exist: {path}")
        return
    for item in os.listdir(path):
        print(f" - {item}")

check_case("d:/tutterfly/apps/frontend/src/lib")
check_case("d:/tutterfly/apps/frontend/src/features/opportunities/components")
check_case("d:/tutterfly/apps/frontend/src/features/opportunities/services")
