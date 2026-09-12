import Header from "../components/landing/Header";
import Hero from "../components/landing/Hero";
import Stages from "../components/landing/Stages";
import TrlLevels from "../components/landing/TrlLevels";
import Campus from "../components/landing/Campus";
import Leadership from "../components/landing/Leadership";
import CtaBanner from "../components/landing/CtaBanner";
import Footer from "../components/landing/Footer";

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Stages />
        <TrlLevels />
        <Campus />
        <Leadership />
        <CtaBanner />
      </main>
      <Footer />
    </>
  );
}