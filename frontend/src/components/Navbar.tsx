import { useEffect, useState } from "react";
import { Link } from "react-router";
import { LogOutIcon, PlusIcon, ShoppingBagIcon, UserIcon } from "lucide-react";
import { logoutUser, refreshSession, type AuthUser } from "../lib/api";
import ThemeSelector from "./ThemeSelector";

function Navbar() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let ignore = false;

    refreshSession()
      .then((response) => {
        if (!ignore) setUser(response.data.user);
      })
      .catch(() => {
        if (!ignore) setUser(null);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
  };

  return (
    <div className="navbar bg-base-300">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4">
        <div className="flex-1">
          <Link to="/" className="btn btn-ghost gap-2">
            <ShoppingBagIcon className="size-5 text-primary" />
            <span className="font-mono text-lg font-bold uppercase tracking-wider">
              Productify
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <ThemeSelector />
          {user ? (
            <>
              <Link to="/create" className="btn btn-primary btn-sm gap-1">
                <PlusIcon className="size-4" />
                <span className="hidden sm:inline">New Product</span>
              </Link>
              <Link to="/profile" className="btn btn-ghost btn-sm gap-1">
                <UserIcon className="size-4" />
                <span className="hidden sm:inline">Profile</span>
              </Link>
              <button type="button" onClick={handleLogout} className="btn btn-ghost btn-sm gap-1">
                <LogOutIcon className="size-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">
                Sign In
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Navbar;
