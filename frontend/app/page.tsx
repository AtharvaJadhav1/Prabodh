import Header from "../components/landing/Header";
import Hero from "../components/landing/Hero";
import Stages from "../components/landing/Stages";
import Accreditations from "../components/landing/Accreditations";
import Awards from "../components/landing/Awards";
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
        <Accreditations />
        <Awards />
        <Campus />
        <Leadership />
        <CtaBanner />
      </main>
      <Footer />
    </>
  );
}