import Link from "next/link";
import { Plus } from "lucide-react";

type FloatingButtonProps = {
  href: string;
};

export default function FloatingButton({ href }: FloatingButtonProps) {
  return (
    <Link
      href={href}
      className="fixed bottom-8 right-8 w-16 h-16 rounded-full bg-emerald-600 text-white shadow-xl flex items-center justify-center hover:bg-emerald-700 transition z-40"
    >
      <Plus size={34} />
    </Link>
  );
}