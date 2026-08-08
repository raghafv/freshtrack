import { Link } from "@tanstack/react-router";
import { Leaf, Mail } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="bg-foreground py-16 text-background lg:py-20">
      <div className="mx-auto max-w-6xl px-6 lg:px-12">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <Leaf className="h-4 w-4" strokeWidth={2} />
              <span className="text-sm font-semibold tracking-[-0.01em]">FreshTrack</span>
            </div>
            <p className="max-w-xs text-[12.5px] leading-relaxed text-background/70">
              A smart pantry tracker that helps households in India waste less food and cook more of
              what they already own.
            </p>
          </div>

          <div>
            <h2 className="mb-4 text-sm font-semibold">Explore</h2>
            <ul className="grid grid-cols-2 gap-x-8 gap-y-3 text-[12.5px] text-background/70">
              <li>
                <a href="#features" className="hover:text-background">
                  Features
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-background">
                  How it works
                </a>
              </li>
              <li>
                <a href="#why" className="hover:text-background">
                  Why FreshTrack
                </a>
              </li>
              <li>
                <Link to="/auth" className="hover:text-background">
                  Sign in
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="mb-4 text-sm font-semibold">Contact</h2>
            <a
              href="mailto:hello@fresh-track.in"
              className="flex items-center gap-2 text-[12.5px] text-background/70 hover:text-background"
            >
              <Mail className="h-3.5 w-3.5" />
              hello@fresh-track.in
            </a>
          </div>
        </div>

        <div className="mt-12 border-t border-background/20 pt-8 text-center text-[12px] text-background/50">
          <p>&copy; {new Date().getFullYear()} FreshTrack. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
