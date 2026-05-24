import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar, Tag, ChevronLeft, ChevronRight, Maximize2, X, ImageIcon, Share2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function parseGallery(description: string | null): { text: string; gallery: string[] } {
  if (!description) return { text: "", gallery: [] };
  const parts = description.split("---gallery---");
  return {
    text: parts[0]?.trim() || "",
    gallery: parts[1]?.trim().split("\n").filter(Boolean) || [],
  };
}

const THUMB_WINDOW = 30;

export default function EventDetail() {
  const { eventId } = useParams();
  const [activeIndex, setActiveIndex] = useState(0);
  const thumbStripRef = useRef<HTMLDivElement>(null);
  const [direction, setDirection] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pinchStateRef = useRef<{ initialDistance: number; initialZoom: number } | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  const { data: event, isLoading } = useQuery({
    queryKey: ["public-event", eventId],
    queryFn: async () => {
      if (!eventId) return null;
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .eq("is_active", true)
        .maybeSingle();
      return data;
    },
    enabled: !!eventId,
  });

  const parsed = useMemo(() => parseGallery(event?.description || null), [event?.description]);
  const allImages = useMemo(
    () => [event?.image_url, ...parsed.gallery].filter(Boolean) as string[],
    [event?.image_url, parsed.gallery]
  );

  const goTo = useCallback(
    (idx: number, dir: number) => {
      setDirection(dir);
      setImgLoaded(false);
      setActiveIndex(idx);
    },
    []
  );

  const goNext = useCallback(() => {
    if (allImages.length <= 1) return;
    goTo((activeIndex + 1) % allImages.length, 1);
  }, [activeIndex, allImages.length, goTo]);

  const goPrev = useCallback(() => {
    if (allImages.length <= 1) return;
    goTo(activeIndex === 0 ? allImages.length - 1 : activeIndex - 1, -1);
  }, [activeIndex, allImages.length, goTo]);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    setLightboxZoom(1);
    pinchStateRef.current = null;
  }, []);

  // Auto-scroll every 4 seconds
  useEffect(() => {
    if (allImages.length <= 1 || lightboxOpen) return;
    timerRef.current = setInterval(goNext, 4000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [goNext, allImages.length, lightboxOpen]);

  useEffect(() => {
    setActiveIndex(0);
    setDirection(0);
    setImgLoaded(false);
  }, [event?.id]);

  // Auto-scroll thumbnail strip
  useEffect(() => {
    if (!thumbStripRef.current) return;
    const container = thumbStripRef.current;
    const thumbWidth = 88;
    const scrollTarget = activeIndex * thumbWidth - container.clientWidth / 2 + thumbWidth / 2;
    container.scrollTo({ left: scrollTarget, behavior: "smooth" });
  }, [activeIndex]);

  // Keyboard nav for lightbox
  useEffect(() => {
    if (!lightboxOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") setLightboxIndex((p) => (p + 1) % allImages.length);
      if (e.key === "ArrowLeft") setLightboxIndex((p) => (p === 0 ? allImages.length - 1 : p - 1));
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handler);
    };
  }, [closeLightbox, lightboxOpen, allImages.length]);

  useEffect(() => {
    if (!lightboxOpen) return;
    setLightboxZoom(1);
    pinchStateRef.current = null;
  }, [lightboxIndex, lightboxOpen]);

  const openLightbox = useCallback((idx: number) => {
    setLightboxIndex(idx);
    setLightboxZoom(1);
    pinchStateRef.current = null;
    setLightboxOpen(true);
  }, []);

  const changeLightboxZoom = useCallback((delta: number) => {
    setLightboxZoom((prev) => Math.max(1, Math.min(4, Number((prev + delta).toFixed(2)))));
  }, []);

  const handleLightboxWheel = useCallback(
    (e: any) => {
      e.preventDefault();
      changeLightboxZoom(e.deltaY < 0 ? 0.2 : -0.2);
    },
    [changeLightboxZoom]
  );

  const handleLightboxTouchStart = useCallback(
    (e: any) => {
      if (e.touches.length !== 2) return;
      const [a, b] = e.touches;
      pinchStateRef.current = {
        initialDistance: Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY),
        initialZoom: lightboxZoom,
      };
    },
    [lightboxZoom]
  );

  const handleLightboxTouchMove = useCallback((e: any) => {
    if (e.touches.length !== 2 || !pinchStateRef.current) return;
    e.preventDefault();
    const [a, b] = e.touches;
    const distance = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
    if (!pinchStateRef.current.initialDistance) return;
    const nextZoom = Math.max(
      1,
      Math.min(4, Number((pinchStateRef.current.initialZoom * (distance / pinchStateRef.current.initialDistance)).toFixed(2)))
    );
    setLightboxZoom(nextZoom);
  }, []);

  const handleLightboxTouchEnd = useCallback((e: any) => {
    if (e.touches.length < 2) pinchStateRef.current = null;
  }, []);

  const thumbStart = Math.max(0, activeIndex - THUMB_WINDOW);
  const thumbEnd = Math.min(allImages.length, activeIndex + THUMB_WINDOW);

  const handleShare = useCallback(() => {
    if (navigator.share && event) {
      navigator.share({ title: event.title, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  }, [event]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container px-4 py-10 space-y-5">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-[60vh] w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <SEOHead title="Event Not Found" description="The requested event could not be found." canonical="/events" />
        <div className="container px-4 py-20 text-center">
          <h1 className="font-display text-3xl font-bold text-foreground">Event not found</h1>
          <p className="font-body text-sm text-muted-foreground mt-2">This event is unavailable or no longer active.</p>
          <Link to="/events" className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-body text-sm font-semibold">
            <ArrowLeft className="w-4 h-4" /> Back to events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={event.title}
        description={(parsed.text || "Event details and gallery from Hoysala Degree College.").slice(0, 155)}
        canonical={`/events/${event.id}`}
        ogImage={event.image_url || undefined}
        schemaJson={{
          "@context": "https://schema.org",
          "@type": "Event",
          name: event.title,
          description: parsed.text || event.title,
          startDate: event.event_date || event.created_at,
          eventStatus: "https://schema.org/EventScheduled",
          eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
          image: event.image_url ? [event.image_url] : undefined,
          location: {
            "@type": "Place",
            name: "Hoysala Degree College",
            address: {
              "@type": "PostalAddress",
              streetAddress: "K.R.P. Arcade, UCO Bank Building, Paramanna Layout",
              addressLocality: "Nelamangala Town",
              addressRegion: "Karnataka",
              postalCode: "562123",
              addressCountry: "IN",
            },
          },
          organizer: {
            "@type": "CollegeOrUniversity",
            name: "Hoysala Degree College",
            url: "https://hoysaladegreecollege.in",
          },
        }}
      />

      {/* Back button + share */}
      <div className="container px-4 pt-6 pb-2 flex items-center justify-between">
        <Link to="/events" className="inline-flex items-center gap-2 text-sm font-body font-semibold text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to events
        </Link>
        <button onClick={handleShare} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-body font-semibold text-muted-foreground hover:text-foreground border border-border/40 hover:border-border transition-all">
          <Share2 className="w-3.5 h-3.5" /> Share
        </button>
      </div>

      {/* Full-width image carousel */}
      <section className="relative w-full h-[55vh] sm:h-[70vh] bg-black overflow-hidden group/carousel">
        {/* Edge gradients for cinematic look */}
        <div className="absolute inset-y-0 left-0 w-16 sm:w-24 z-[5] pointer-events-none" style={{ background: "linear-gradient(90deg, rgba(0,0,0,0.4), transparent)" }} />
        <div className="absolute inset-y-0 right-0 w-16 sm:w-24 z-[5] pointer-events-none" style={{ background: "linear-gradient(-90deg, rgba(0,0,0,0.4), transparent)" }} />
        
        <div className="absolute inset-0 w-full h-full flex items-center justify-center">
          {!imgLoaded && (
            <div className="absolute inset-0 flex items-center justify-center z-[1]">
              <div className="w-8 h-8 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
            </div>
          )}
          <img
            key={allImages[activeIndex]}
            src={allImages[activeIndex] || "/placeholder.svg"}
            alt={`${event.title} - Image ${activeIndex + 1}`}
            className={`w-full h-full object-contain transition-opacity duration-300 cursor-pointer ${imgLoaded ? "opacity-100" : "opacity-0"}`}
            draggable={false}
            onLoad={() => setImgLoaded(true)}
            onClick={() => openLightbox(activeIndex)}
          />
        </div>

        {/* Fullscreen button - glassmorphism */}
        <button
          onClick={() => openLightbox(activeIndex)}
          className="absolute top-4 left-4 w-10 h-10 rounded-xl bg-black/30 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/50 hover:border-white/20 transition-all duration-300 z-10"
          aria-label="View fullscreen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Nav arrows - glassmorphism */}
        {allImages.length > 1 && (
          <>
            <button
              onClick={goPrev}
              className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-black/30 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/50 hover:border-white/20 hover:scale-105 transition-all duration-300 z-10"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goNext}
              className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-black/30 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/50 hover:border-white/20 hover:scale-105 transition-all duration-300 z-10"
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Image counter - glassmorphism pill */}
        {allImages.length > 1 && (
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            <span className="inline-flex items-center gap-1.5 text-xs font-body font-semibold text-white/90 bg-black/30 backdrop-blur-xl border border-white/10 px-3.5 py-1.5 rounded-xl">
              <ImageIcon className="w-3 h-3 text-white/50" />
              {activeIndex + 1} / {allImages.length}
            </span>
          </div>
        )}
      </section>

      {/* Thumbnail strip - with active glow */}
      {allImages.length > 1 && (
        <div className="container px-4 py-3">
          <div
            ref={thumbStripRef}
            className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
            style={{ scrollBehavior: "smooth" }}
          >
            {thumbStart > 0 && <div style={{ minWidth: thumbStart * 88, flexShrink: 0 }} />}
            {allImages.slice(thumbStart, thumbEnd).map((url, i) => {
              const idx = thumbStart + i;
              const isActive = idx === activeIndex;
              return (
                <button
                  key={`thumb-${idx}`}
                  onClick={() => goTo(idx, idx > activeIndex ? 1 : -1)}
                  className={`shrink-0 rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                    isActive
                      ? "border-primary scale-105"
                      : "border-transparent opacity-50 hover:opacity-90 hover:border-border/40"
                  }`}
                  style={isActive ? { boxShadow: "0 0 12px hsl(var(--primary) / 0.3)" } : {}}
                >
                  <img
                    src={url}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-16 h-12 sm:w-20 sm:h-14 object-cover"
                    loading="lazy"
                  />
                </button>
              );
            })}
            {thumbEnd < allImages.length && <div style={{ minWidth: (allImages.length - thumbEnd) * 88, flexShrink: 0 }} />}
          </div>
        </div>
      )}

      {/* Event details — glassmorphism card */}
      <section className="container px-4 py-6 sm:py-10">
        <div className="max-w-3xl mx-auto space-y-5">
          <motion.header 
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="font-display text-2xl sm:text-4xl font-bold text-foreground leading-tight">{event.title}</h1>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary font-body text-xs font-semibold backdrop-blur-sm"
                style={{ boxShadow: "0 0 10px hsl(var(--primary) / 0.08)" }}>
                <Tag className="w-3.5 h-3.5" /> {event.category || "General"}
              </span>
              {event.event_date && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-muted/80 border border-border/30 text-muted-foreground font-body text-xs font-semibold backdrop-blur-sm">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(event.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                </span>
              )}
              {allImages.length > 1 && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-secondary/10 border border-secondary/20 text-secondary font-body text-xs font-semibold backdrop-blur-sm">
                  <ImageIcon className="w-3.5 h-3.5" /> {allImages.length} Photos
                </span>
              )}
            </div>
          </motion.header>

          <motion.div 
            className="relative rounded-2xl border border-border/40 bg-card overflow-hidden"
            style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.04)" }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Top accent line */}
            <div className="h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            <div className="p-5 sm:p-7">
              <h2 className="font-display text-lg font-bold text-foreground mb-3">Event Details</h2>
              <p className="font-body text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {parsed.text || "No description available for this event yet."}
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Fullscreen Lightbox */}
      {createPortal(
        <AnimatePresence>
          {lightboxOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-[9999] bg-black flex items-center justify-center"
              onClick={closeLightbox}
            >
              <button
                onClick={closeLightbox}
                className="absolute top-4 right-4 w-11 h-11 rounded-xl bg-white/10 backdrop-blur-xl border border-white/15 flex items-center justify-center text-white hover:bg-white/20 transition-all z-20"
                aria-label="Close fullscreen"
              >
                <X className="w-5 h-5" />
              </button>

              {allImages.length > 1 && (
                <span className="absolute top-4 left-4 text-sm font-body font-semibold text-white/80 bg-white/10 backdrop-blur-xl border border-white/15 px-4 py-1.5 rounded-xl z-20">
                  {lightboxIndex + 1} / {allImages.length}
                </span>
              )}

              {/* Zoom controls */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
                <button
                  onClick={(e) => { e.stopPropagation(); changeLightboxZoom(-0.2); }}
                  className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xl border border-white/15 flex items-center justify-center text-white hover:bg-white/20 transition-all touch-manipulation"
                >
                  −
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setLightboxZoom(1); }}
                  className="px-3 h-10 rounded-xl bg-white/10 backdrop-blur-xl border border-white/15 flex items-center justify-center text-white/90 text-xs font-body font-semibold hover:bg-white/20 transition-all touch-manipulation"
                >
                  {Math.round(lightboxZoom * 100)}%
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); changeLightboxZoom(0.2); }}
                  className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xl border border-white/15 flex items-center justify-center text-white hover:bg-white/20 transition-all touch-manipulation"
                >
                  +
                </button>
              </div>

              {/* Main lightbox image */}
              <div
                className="relative max-w-full max-h-full overflow-hidden touch-manipulation"
                onClick={(e) => e.stopPropagation()}
                onWheel={handleLightboxWheel}
                onTouchStart={handleLightboxTouchStart}
                onTouchMove={handleLightboxTouchMove}
                onTouchEnd={handleLightboxTouchEnd}
                style={{ touchAction: lightboxZoom > 1 ? "none" : "pan-y" }}
              >
                <motion.img
                  key={`lb-img-${lightboxIndex}`}
                  src={allImages[lightboxIndex]}
                  alt={`${event.title} - Fullscreen ${lightboxIndex + 1}`}
                  className="max-w-[90vw] max-h-[80vh] object-contain select-none touch-manipulation cursor-grab active:cursor-grabbing"
                  draggable={false}
                  style={{ transform: `scale(${lightboxZoom})`, transition: "transform 0.15s ease-out" }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setLightboxZoom((z) => (z === 1 ? 2 : 1));
                  }}
                  drag={lightboxZoom === 1 ? "x" : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragEnd={(_e, info) => {
                    if (lightboxZoom > 1 || allImages.length <= 1) return;
                    if (info.offset.x < -80) setLightboxIndex((p) => (p + 1) % allImages.length);
                    else if (info.offset.x > 80) setLightboxIndex((p) => (p === 0 ? allImages.length - 1 : p - 1));
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                />
              </div>

              {/* Lightbox nav arrows */}
              {allImages.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxIndex((p) => (p === 0 ? allImages.length - 1 : p - 1));
                    }}
                    className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-xl bg-white/10 backdrop-blur-xl border border-white/15 flex items-center justify-center text-white hover:bg-white/20 transition-all z-20"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxIndex((p) => (p + 1) % allImages.length);
                    }}
                    className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-xl bg-white/10 backdrop-blur-xl border border-white/15 flex items-center justify-center text-white hover:bg-white/20 transition-all z-20"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}

              {/* Lightbox thumbnail strip */}
              {allImages.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20 max-w-[90vw] overflow-x-auto pb-1">
                  {allImages
                    .slice(Math.max(0, lightboxIndex - 15), Math.min(allImages.length, lightboxIndex + 15))
                    .map((url, i) => {
                      const idx = Math.max(0, lightboxIndex - 15) + i;
                      const isActive = idx === lightboxIndex;
                      return (
                        <button
                          key={`lb-${idx}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setLightboxIndex(idx);
                          }}
                          className={`shrink-0 rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                            isActive ? "border-white scale-110" : "border-transparent opacity-50 hover:opacity-80"
                          }`}
                          style={isActive ? { boxShadow: "0 0 16px rgba(255,255,255,0.3)" } : {}}
                        >
                          <img src={url} alt={`Thumb ${idx + 1}`} className="w-14 h-10 sm:w-16 sm:h-12 object-cover" loading="lazy" />
                        </button>
                      );
                    })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
