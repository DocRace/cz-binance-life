import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { useTranslation } from "react-i18next";
import { Calendar, MapPin, Briefcase, TrendingUp, Award, Users, Zap, Shield } from "lucide-react";

interface TimelineEvent {
  year: string;
  title: string;
  description: string;
  location?: string;
  category: "education" | "career" | "milestone" | "achievement";
  icon: any;
  details?: string[];
}

export default function Timeline() {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const timelineEvents: TimelineEvent[] = [
    {
      year: "1977",
      title: t("timeline.event1Title"),
      description: t("timeline.event1Desc"),
      location: "中國江蘇",
      category: "milestone",
      icon: Calendar,
      details: [
        t("timeline.event1Detail1"),
        t("timeline.event1Detail2")
      ]
    },
    {
      year: "1989",
      title: t("timeline.event2Title"),
      description: t("timeline.event2Desc"),
      location: "加拿大溫哥華",
      category: "milestone",
      icon: MapPin,
      details: [
        t("timeline.event2Detail1"),
        t("timeline.event2Detail2"),
        t("timeline.event2Detail3")
      ]
    },
    {
      year: "1995-2001",
      title: t("timeline.event3Title"),
      description: t("timeline.event3Desc"),
      location: "加拿大蒙特利爾",
      category: "education",
      icon: Award,
      details: [
        t("timeline.event3Detail1"),
        t("timeline.event3Detail2"),
        t("timeline.event3Detail3")
      ]
    },
    {
      year: "2001-2005",
      title: t("timeline.event4Title"),
      description: t("timeline.event4Desc"),
      location: "日本東京",
      category: "career",
      icon: Briefcase,
      details: [
        t("timeline.event4Detail1"),
        t("timeline.event4Detail2"),
        t("timeline.event4Detail3")
      ]
    },
    {
      year: "2005-2013",
      title: t("timeline.event5Title"),
      description: t("timeline.event5Desc"),
      location: "美國紐約",
      category: "career",
      icon: TrendingUp,
      details: [
        t("timeline.event5Detail1"),
        t("timeline.event5Detail2"),
        t("timeline.event5Detail3"),
        t("timeline.event5Detail4")
      ]
    },
    {
      year: "2013",
      title: t("timeline.event6Title"),
      description: t("timeline.event6Desc"),
      location: "中國上海",
      category: "achievement",
      icon: Zap,
      details: [
        t("timeline.event6Detail1"),
        t("timeline.event6Detail2"),
        t("timeline.event6Detail3")
      ]
    },
    {
      year: "2014-2017",
      title: t("timeline.event7Title"),
      description: t("timeline.event7Desc"),
      location: "中國",
      category: "career",
      icon: Users,
      details: [
        t("timeline.event7Detail1"),
        t("timeline.event7Detail2"),
        t("timeline.event7Detail3")
      ]
    },
    {
      year: "2017.07",
      title: t("timeline.event8Title"),
      description: t("timeline.event8Desc"),
      location: "全球",
      category: "achievement",
      icon: Shield,
      details: [
        t("timeline.event8Detail1"),
        t("timeline.event8Detail2"),
        t("timeline.event8Detail3"),
        t("timeline.event8Detail4")
      ]
    },
    {
      year: "2017.12",
      title: t("timeline.event9Title"),
      description: t("timeline.event9Desc"),
      location: "全球",
      category: "achievement",
      icon: TrendingUp,
      details: [
        t("timeline.event9Detail1"),
        t("timeline.event9Detail2"),
        t("timeline.event9Detail3")
      ]
    },
    {
      year: "2018",
      title: t("timeline.event10Title"),
      description: t("timeline.event10Desc"),
      location: "馬耳他",
      category: "milestone",
      icon: MapPin,
      details: [
        t("timeline.event10Detail1"),
        t("timeline.event10Detail2"),
        t("timeline.event10Detail3")
      ]
    },
    {
      year: "2019",
      title: t("timeline.event11Title"),
      description: t("timeline.event11Desc"),
      location: "全球",
      category: "achievement",
      icon: Award,
      details: [
        t("timeline.event11Detail1"),
        t("timeline.event11Detail2"),
        t("timeline.event11Detail3")
      ]
    },
    {
      year: "2020-2021",
      title: t("timeline.event12Title"),
      description: t("timeline.event12Desc"),
      location: "全球",
      category: "achievement",
      icon: TrendingUp,
      details: [
        t("timeline.event12Detail1"),
        t("timeline.event12Detail2"),
        t("timeline.event12Detail3")
      ]
    },
    {
      year: "2023",
      title: t("timeline.event13Title"),
      description: t("timeline.event13Desc"),
      location: "美國",
      category: "milestone",
      icon: Shield,
      details: [
        t("timeline.event13Detail1"),
        t("timeline.event13Detail2"),
        t("timeline.event13Detail3")
      ]
    },
    {
      year: "2024",
      title: t("timeline.event14Title"),
      description: t("timeline.event14Desc"),
      location: "全球",
      category: "achievement",
      icon: Award,
      details: [
        t("timeline.event14Detail1"),
        t("timeline.event14Detail2"),
        t("timeline.event14Detail3")
      ]
    }
  ];

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "education":
        return "from-[#4ade80] to-[#22c55e]";
      case "career":
        return "from-stone-400 to-stone-600";
      case "milestone":
        return "from-gold to-gold-dark";
      case "achievement":
        return "from-stone-600 to-[#a855f7]";
      default:
        return "from-gold to-gold-dark";
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;

      const scrollPosition = window.scrollY;
      const windowHeight = window.innerHeight;
      const containerTop = containerRef.current.offsetTop;

      const events = document.querySelectorAll('.timeline-event');
      events.forEach((event, index) => {
        const eventTop = (event as HTMLElement).offsetTop;
        const eventPosition = containerTop + eventTop - scrollPosition;

        if (eventPosition < windowHeight * 0.6 && eventPosition > -windowHeight * 0.4) {
          setActiveIndex(index);
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background" ref={containerRef}>
      {/* Hero Section */}
      <div className="relative overflow-hidden py-20 px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-gold/10 to-transparent" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="container mx-auto text-center relative z-10"
        >
          <h1 className="font-display text-5xl md:text-6xl mb-6">
            <span className="bg-gradient-to-r from-gold to-gold-light bg-clip-text text-transparent">
              {t("timeline.title")}
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t("timeline.subtitle")}
          </p>
        </motion.div>
      </div>

      {/* Timeline */}
      <div className="container mx-auto px-6 pb-20">
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-gold via-stone-400 to-stone-600 opacity-30" />

          {/* Events */}
          <div className="space-y-24">
            {timelineEvents.map((event, index) => {
              const Icon = event.icon;
              const isLeft = index % 2 === 0;
              const isActive = activeIndex === index;

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className={`timeline-event relative ${isLeft ? 'md:pr-1/2' : 'md:pl-1/2'}`}
                >
                  {/* Timeline Node */}
                  <div className={`absolute left-8 md:left-1/2 top-8 transform -translate-x-1/2 z-10`}>
                    <motion.div
                      animate={{
                        scale: isActive ? 1.2 : 1,
                        opacity: isActive ? 1 : 0.6
                      }}
                      transition={{ duration: 0.3 }}
                      className={`w-16 h-16 rounded-full bg-gradient-to-br ${getCategoryColor(event.category)} flex items-center justify-center shadow-lg`}
                    >
                      <Icon className="w-8 h-8 text-white" />
                    </motion.div>
                  </div>

                  {/* Content Card */}
                  <div className={`ml-28 md:ml-0 ${isLeft ? 'md:mr-20' : 'md:ml-20'}`}>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className={`relative p-8 rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm transition-all duration-500 ${
                        isActive ? 'border-gold/50 shadow-lg shadow-gold/10' : ''
                      }`}
                    >
                      {/* Year Badge */}
                      <div className="absolute -top-4 left-6">
                        <span className={`px-4 py-2 rounded-full bg-gradient-to-r ${getCategoryColor(event.category)} text-white font-tech text-sm shadow-lg`}>
                          {event.year}
                        </span>
                      </div>

                      {/* Location */}
                      {event.location && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 mt-4">
                          <MapPin className="w-4 h-4" />
                          <span>{event.location}</span>
                        </div>
                      )}

                      {/* Title */}
                      <h3 className="font-display text-2xl mb-3">{event.title}</h3>

                      {/* Description */}
                      <p className="text-muted-foreground leading-relaxed mb-4">
                        {event.description}
                      </p>

                      {/* Details */}
                      {event.details && event.details.length > 0 && (
                        <ul className="space-y-2">
                          {event.details.map((detail, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <span className="text-gold mt-1">▸</span>
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Connector Arrow */}
                      <div className={`hidden md:block absolute top-8 ${isLeft ? 'right-0 translate-x-full' : 'left-0 -translate-x-full'} w-8 h-0.5 bg-gradient-to-r ${isLeft ? 'from-border to-transparent' : 'from-transparent to-border'}`} />
                    </motion.div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Scroll Progress Indicator */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold via-stone-400 to-stone-600 origin-left z-50"
        style={{ scaleX: scrollYProgress }}
      />
    </div>
  );
}
