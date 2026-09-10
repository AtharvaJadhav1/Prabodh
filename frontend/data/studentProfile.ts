export type Skill = { name: string; level?: string; tag?: string };

export type Project = {
  title: string;
  badge?: string;
  team: string;
  role?: string;
  repo: string;
  description: string;
  stack: string[];
};

export type Certification = {
  name: string;
  issuer: string;
  credential?: string;
  date?: string;
  verified: boolean;
};

export type Experience = {
  title: string;
  org: string;
  period: string;
  location?: string;
  current?: boolean;
  description: string;
};

export type Achievement = {
  title: string;
  description: string;
};

export const profile = {
  initials: "AN",
  fullName: "Ayush Dilip Nakod",
  verified: true,
  bio: "AI & Analytics Student • Python Developer • Building GenAI & Distributed Systems",
  school: "School of Computing",
  prn: "ADT23SOCB0287",
  team: "Team Nex-Aura",
  role: "Leader",
  hackathonBadge: "Smart India Hackathon 2026",
  contacts: {
    phone: "+91 9511521288", // visible: self only (enforce via API)
    email: "ayush.nakod@mitadt.ac.in",
    github: "https://github.com/ayushnakod",
    linkedin: "https://linkedin.com/in/ayushnakod",
    website: "https://ayushnakod.dev",
  },
  skills: {
    primary: [
      { name: "Python", level: "Advanced" },
      { name: "Django / FastAPI" },
      { name: "LLM Agents (LangChain, AutoGen)", tag: "SIH Focus" },
      { name: "PyTorch" },
      { name: "SQL (Complex Queries & Optimizations)" },
      { name: "Data Structures & Algorithms" },
    ] as Skill[],
    secondary: ["Rust", "Next.js", "Tailwind CSS", "Docker", "Git / GitHub", "PostgreSQL"],
    tracks: ["AI / Machine Learning", "Backend Engineering", "System Architecture"],
  },
  projects: [
    {
      title: "Nex-Trade AI: Distributed Autonomous Quant Engine",
      badge: "SIH Selected",
      team: "Team Nex-Aura",
      role: "Lead Architect & Backend Developer",
      repo: "#",
      description:
        "Engineered high-throughput event-driven microservices using FastAPI, Redis Streams, and LangGraph multi-agent systems for predictive market analytics under sub-100ms latency constraints.",
      stack: ["Python", "FastAPI", "LangGraph", "PostgreSQL"],
    },
    {
      title: "Distributed RAG Knowledge Core for Campus Records",
      team: "Academic Capstone • MIT-ADT University",
      repo: "#",
      description:
        "Built a hybrid semantic search portal indexing academic transcripts and faculty research publications with Milvus vector database and Ollama local LLM execution.",
      stack: ["PyTorch", "Milvus", "Docker"],
    },
  ] as Project[],
  certifications: [
    {
      name: "Deep Learning Specialization",
      issuer: "DeepLearning.AI • Coursera",
      credential: "DL-839210",
      verified: true,
    },
    {
      name: "AWS Certified Solutions Architect – Associate",
      issuer: "Amazon Web Services",
      date: "Dec 2023",
      verified: true,
    },
  ] as Certification[],
  experience: [
    {
      title: "AI Research Intern",
      org: "Center of Excellence in AI & Analytics, MIT-ADT",
      period: "Aug 2023 – Present",
      location: "Pune, India",
      current: true,
      description:
        "Researching quantized small language models (SLMs) for on-device inferencing on resource-constrained embedded microcontrollers. Mentoring sophomore batches in Python algorithms.",
    },
  ] as Experience[],
  achievements: [
    {
      title: "SIH 2023 Internal Round Winner",
      description:
        "Ranked 1st among 85 university teams pitching solutions for smart automation in agricultural supply chains.",
    },
    {
      title: "LeetCode Top 5% Global",
      description:
        "Solved 650+ algorithmic challenges with Knight badge status (Rating: 1940+).",
    },
  ] as Achievement[],
};

export type Profile = typeof profile;
