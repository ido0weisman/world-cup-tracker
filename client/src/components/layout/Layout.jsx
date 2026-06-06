import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import Header from './Header';
import Footer from './Footer';
import FactsBanner from '../ui/FactsBanner';

// Free World Cup photos from Wikimedia Commons — confirmed working from previous project
const WM = 'https://upload.wikimedia.org/wikipedia/commons';
const TH = `${WM}/thumb`;

const BG_IMAGES = [
  // 2022 — Qatar
  `${WM}/1/1e/Argentina_3-3_Francia_-_Copa_Mundial_2022_-_Messi_patea_un_penal.jpg`,
  `${WM}/2/2e/Argentina_3-3_Francia_-_Copa_Mundial_2022_-_Celebraci%C3%B3n_de_victoria.jpg`,
  `${WM}/c/ce/Lionel-Messi-Argentina-2022-FIFA-World-Cup.jpg`,
  // 2018 — Russia
  `${TH}/0/0a/2018_World_Cup_Final_%282018-07-15%29_02.jpg/1920px-2018_World_Cup_Final_%282018-07-15%29_02.jpg`,
  `${WM}/1/14/France_celebrate_on_the_field_of_Luzhniki_after_the_2018_FIFA_World_Cup_Final.jpg`,
  `${WM}/d/d9/Lionel_Messi_20180626_%28cropped%29.jpg`,
  // 2014 — Brazil
  `${TH}/5/56/Mario_G%C3%B6tze_GOL_-_The_2014_FIFA_World_Cup_Final_-_140713-9112-jikatu_%2814463413827%29.jpg/1920px-Mario_G%C3%B6tze_GOL_-_The_2014_FIFA_World_Cup_Final_-_140713-9112-jikatu_%2814463413827%29.jpg`,
  `${TH}/8/89/Germany_and_Argentina_face_off_in_the_final_of_the_World_Cup_2014_-2014-07-13_%285%29.jpg/1920px-Germany_and_Argentina_face_off_in_the_final_of_the_World_Cup_2014_-2014-07-13_%285%29.jpg`,
  `${TH}/1/1f/Germany_1_-_Argentina_0_-The_2014_FIFA_World_Cup_Final_-_140713-9131-jikatu_%2814661476856%29.jpg/1920px-Germany_1_-_Argentina_0_-The_2014_FIFA_World_Cup_Final_-_140713-9131-jikatu_%2814661476856%29.jpg`,
  // 2010 — South Africa
  `${TH}/0/06/FIFA_World_Cup_2010_Spain_with_cup.jpg/1920px-FIFA_World_Cup_2010_Spain_with_cup.jpg`,
  `${TH}/0/0f/Spain-Holland_-_World_Champion_the_fine_art_of_diagonal_kissing.jpg/1920px-Spain-Holland_-_World_Champion_the_fine_art_of_diagonal_kissing.jpg`,
  `${TH}/5/52/Spanish_World_Cup_celebration.jpg/1920px-Spanish_World_Cup_celebration.jpg`,
];

function getRandomBg(excludeUrl) {
  const choices = BG_IMAGES.filter(img => img !== excludeUrl);
  return choices[Math.floor(Math.random() * choices.length)];
}

function Layout() {
  const location  = useLocation();
  const [bg,      setBg]      = useState(BG_IMAGES[0]);
  const [opacity, setOpacity] = useState(1);
  const prevPath  = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname === prevPath.current) return;
    prevPath.current = location.pathname;

    // Fade out → swap image → fade in
    setOpacity(0);
    const timer = setTimeout(() => {
      setBg(current => getRandomBg(current));
      setOpacity(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <div
        className="app-bg-photo"
        style={{ backgroundImage: `url(${bg})`, opacity }}
      />
      <div className="app-bg-overlay" />
      <Header />
      <main className="main-content">
        <Outlet />
      </main>
      <FactsBanner />
      <Footer />
    </div>
  );
}

export default Layout;
