import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { X, ExternalLink } from "lucide-react";
import { useLocation } from "react-router-dom";

export default function PopupBanner() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: banners = [] } = useQuery({
    queryKey: ["popup-banners"],
    queryFn: async () => {
      const { data } = await supabase
        .from("popup_banners")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1);
      return data || [];
    },
  });

  useEffect(() => {
    if (banners.length > 0) {
      const shown = sessionStorage.getItem("popup-banner-shown");
      if (!shown) {
        const timer = setTimeout(() => {
          setIsOpen(true);
          sessionStorage.setItem("popup-banner-shown", "true");
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [banners]);

  if (!isOpen || banners.length === 0 || location.pathname !== "/") return null;

  const banner = banners[0];

  return (
    <div className="fixed inset-0 bg-foreground/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-card rounded-3xl border border-border shadow-2xl w-full max-w-lg overflow-hidden animate-scale-bounce">
        {/* Close button */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-display text-base font-bold text-foreground">{banner.title}</h3>
          <button onClick={() => setIsOpen(false)}
            className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {banner.image_url && (
          <div className="relative">
            {banner.image_url.match(/\.(mp4|webm|mov)$/i) ? (
              <video src={banner.image_url} autoPlay muted loop className="w-full max-h-72 object-cover" />
            ) : (
              <img src={banner.image_url} alt={banner.title} className="w-full max-h-[70vh] object-contain" />
            )}
          </div>
        )}

        <div className="p-5 flex gap-3">
          {banner.link_url && (
            <a href={banner.link_url} target="_blank" rel="noopener noreferrer" onClick={() => setIsOpen(false)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary text-primary-foreground font-body text-sm font-semibold hover:bg-primary/90 transition-colors">
              Learn more
            </a>
          )}
          <button onClick={() => setIsOpen(false)}
            className="flex-1 py-3 rounded-2xl border-2 border-border font-body text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
