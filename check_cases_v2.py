import os

def check_case(path):
    print(f"\nDIR: {path}")
    if not os.path.exists(path):
        print("NOT FOUND")
        return
    for item in sorted(os.listdir(path)):
        full_path = os.path.join(path, item)
        is_dir = "[DIR]" if os.path.isdir(full_path) else "     "
        print(f"{is_dir} {item}")

check_case("d:/tutterfly/apps/frontend/src/lib")
check_case("d:/tutterfly/apps/frontend/src/features/opportunities/components")
check_case("d:/tutterfly/apps/frontend/src/features/opportunities/api")
check_case("d:/tutterfly/apps/frontend/src/features/opportunities/services")
check_case("d:/tutterfly/apps/frontend/src/features/opportunities/types")
