
import fs from 'fs';
import path from 'path';

// 1. Manually copy-pasted data from seed.ts (Validation step will confirm this matches)
const dishesData = [
    { name: 'Balish (Tovuqli pirog)', img: '1.png' },
    { name: "Tariq bo'tqasi (Pshonaya kasha)", img: '17.png' },
    { name: 'Tovuqli blinchik', img: '13.png' },
    { name: 'Sutli zapekanka (Vermeshel bilan)', img: '8.png' },
    { name: 'Grechka kasha', img: '26.png' },
    { name: 'Skrembl (Ismaloqli tuxum)', img: '29.png' },
    { name: 'Fritata (Indeyka va pishloqli)', img: '41.png' },
    { name: 'Ovsianka kasha (Sutli)', img: '36.png' },
    { name: 'Shakshuka (Pomidorli tuxum)', img: '46.png' },
    { name: 'Pshenka kasha (Tariq)', img: '51.png' },
    { name: 'Achma (Tvorog va pishloqli)', img: '57.png' },
    { name: 'Kesadilya (Lavashda pishloq va sabzavot)', img: '57.png' },
    { name: "Bug'doy kasha (Pshenichnaya)", img: '62.png' },
    { name: 'Tvorogli nonushta (Smetana bilan)', img: '70.png' },
    { name: "Shokoladli kasha (Kakao qo'shilgan)", img: '72.png' },
    { name: 'Omlet (Motsarella bilan)', img: '11.png' },
    { name: 'Sendvich (Tovuq va bodringli)', img: '83.png' },
    { name: 'Ovsianka Kefirda (Tungi ivitilgan)', img: '105.png' },
    { name: 'Arpa kashasi (Yachka)', img: '92.png' },
    { name: 'Sirniki (Tvorogli quymoq)', img: '104.png' },
    { name: 'Glazunya (Qovurilgan tuxum)', img: '102.png' },
    { name: 'Qovoq tatlisi (Shakar bilan dimlangan)', img: '5.png' },
    { name: "Mazurka (Yong'oq va mayizli pirog)", img: '6.png' },
    { name: 'Tvorogli pirog', img: '14.png' },
    { name: 'Mevali assorti', img: '19.png' },
    { name: 'Shoko blinchik', img: '22.png' },
    { name: 'Limonli maffin', img: '28.png' },
    { name: 'Tvorogli desert (Pechenye bilan)', img: '32.png' },
    { name: 'Shokoladli rulet', img: '37.png' },
    { name: 'Chia puding', img: '47.png' },
    { name: 'Brauni (PP usulida)', img: '48.png' },
    { name: 'Vafli (Soddasi va Shokoladlisi)', img: '54.png' },
    { name: 'Sharlotka (Olmali pirog)', img: '58.png' },
    { name: 'Ovsianka pechenye', img: '63.png' },
    { name: 'Medovik (Asalli tort)', img: '68.png' },
    { name: 'Chizkeyk', img: '73.png' },
    { name: 'Trileche', img: '78.png' },
    { name: 'Shokoladli maffin', img: '88.png' },
    { name: 'Bananli blinchik', img: '93.png' },
    { name: 'Granola (Yogurt bilan)', img: '98.png' },
    { name: 'Apelsinli maffin', img: '103.png' },
    { name: "Mol go'shti va Qo'ziqorin (Garnir: Grechka)", img: '2.png' },
    { name: 'Tovuq kabob (Garnir: Aralash sabzavot)', img: '9.png' },
    { name: 'Gulyash (Garnir: Spagetti)', img: '15.png' },
    { name: 'Jigar qovurma (Garnir: Kartoshka pyure)', img: '18.png' },
    { name: 'Buffalo qanotchalar (Garnir: Qizil sabzi)', img: '23.png' },
    { name: 'Karni yarik (Qiymali baqlajon)', img: '27.png' },
    { name: 'Baliqli kotlet (Garnir: Perlovka)', img: '33.png' },
    { name: "Brizol (Garnir: Bulg'ur)", img: '38.png' },
    { name: 'Tovuq soni (Garnir: Kartoshka)', img: '43.png' },
    { name: 'Kotlet (Mol+Tovuq) (Garnir: Noxat)', img: '49.png' },
    { name: 'Tovuq rulet (Sabzavotli)', img: '52.png' },
    { name: "Bulg'ur palov", img: '59.png' },
    { name: "Frikase (Tovuq va qo'ziqorinli)", img: '64.png' },
    { name: 'Hasanposho kofte (Pyureli kotlet, Garnir: Guruch)', img: '69.png' },
    { name: "Tovuksay (Tovuq va sabzavotlar, Garnir: Bulg'ur)", img: '74.png' },
    { name: 'Lyulya kabob (Garnir: Spagetti)', img: '79.png' },
    { name: 'Tovuqli kotlet (Pishloqli, Garnir: Grechka)', img: '85.png' },
    { name: "Do'lma (Tok oshi)", img: '89.png' },
    { name: 'Kiyev kotleti (Garnir: Perlovka)', img: '94.png' },
    { name: "Bif Burginyon (Go'sht va sabzavotli ragu)", img: '99.png' },
    { name: 'Dalan kofte (Tovuqli, Garnir: Baqlajon/Qovoqcha)', img: '108.png' },
    { name: "Lavlagi salati (Yong'oqli / Olmali / Brinzali)", img: '3.png' },
    { name: 'Tulum salati (Tvorog, Olma, Aysberg)', img: '56.png' },
    { name: "Tabule salati (Bulg'ur va ko'kat)", img: '21.png' },
    { name: 'Suzmali salat', img: '24.png' },
    { name: 'Nisuaz salati (Tuna yoki Tovuq bilan)', img: '31.png' },
    { name: 'Vinegret', img: '34.png' },
    { name: 'Sezar salati', img: '39.png' },
    { name: 'Olivye salati', img: '44.png' },
    { name: 'Ikra (Sabzavotli) va Xlebci', img: '50.png' },
    { name: 'Xumus va Xlebci', img: '67.png' },
    { name: 'Fransuzcha salat (Karam, lavlagi, sabzi)', img: '77.png' },
    { name: 'Baqlajon salat', img: '75.png' },
    { name: 'Pashtet (Jigar) va Xlebci', img: '86.png' },
    { name: 'Mavsumiy salat (Sabzi, bodring)', img: '95.png' },
    { name: 'Sushi (Kimpab)', img: '100.png' },
    { name: 'Tofu salati', img: '107.png' },
    { name: "Tovuq sho'rva", img: '4.png' },
    { name: "Frikadelka sho'rva (Go'shtli/Tovuqli)", img: '76.png' },
    { name: "Terbiye sho'rva (Qatiqli)", img: '7.png' },
    { name: 'Borsh', img: '20.png' },
    { name: "Brokkoli sho'rva", img: '30.png' },
    { name: "Shi sho'rvasi (Shovul bilan)", img: '35.png' },
    { name: 'Minestrone (Loviya va sabzavotli)', img: '40.png' },
    { name: "Ezogelin (Yasmiqli turkcha sho'rva)", img: '45.png' },
    { name: "Qo'ziqorinli sho'rva (Slivkali/Sutli)", img: '53.png' },
    { name: "Qizil sabzi sho'rva (Sosiska bilan)", img: '61.png' },
    { name: "Til sho'rva (Til va qaymoqli)", img: '66.png' },
    { name: "Yashil sho'rva (Ismaloqli)", img: '71.png' },
    { name: "Chuchvarali sho'rva", img: '82.png' },
    { name: "Qovoq sho'rva (Pyure)", img: '91.png' },
    { name: "Chechevitsa sho'rva (Yasmiq)", img: '101.png' },
    // 6th Meal
    { name: "Mol go'shti va Guruch (Oddiy qaynatma/dimlama)", img: '2.png' },
    { name: "Tovuq filesi va Makaron", img: '74.png' },
    { name: "Mol go'shti va Grechka", img: '2.png' },
    { name: "Tovuq kotleti va Non (Sendvich)", img: '85.png' },
    { name: "Mol go'shti va Bulg'ur", img: '2.png' },
    { name: "Tovuq filesi va Sabzavotlar (Dimlama)", img: '74.png' },
    { name: "Go'shtli teftel va Guruch", img: '49.png' },
    { name: "Tovuq filesi va Karam (Dimlama)", img: '74.png' },
    { name: "Tovuq filesi va Yasmiq (Garnir)", img: '74.png' },
    { name: "Mol go'shti va Sabzavotli ragu", img: '15.png' },
    { name: "Tovuq filesi va Guruch", img: '74.png' },
    { name: "Mol go'shti va Makaron", img: '2.png' },
    { name: "Tovuq kotleti va Grechka", img: '85.png' },
    { name: "Mol go'shti va Sabzavotlar", img: '2.png' },
    { name: "Tovuq filesi va Perlovka", img: '33.png' },
];

import { MENUS } from '../src/lib/menuData';

// Helper to normalized comparison
function normalize(str: string) {
    return str.toLowerCase().replace(/[^a-z]/g, '');
}

async function main() {
    const map: Record<number, string> = {};

    MENUS.forEach(menu => {
        menu.dishes.forEach(dish => {
            // Find in dishesData
            const match = dishesData.find(d => {
                // Try exact match or partial
                return normalize(d.name).includes(normalize(dish.name)) || normalize(dish.name).includes(normalize(d.name));
            });

            if (match && match.img) {
                map[dish.id] = match.img;
            } else {
                console.warn(`No match found for Dish ID ${dish.id}: ${dish.name}`);
            }
        });
    });

    console.log('// GENERATED DISH IMAGE MAP');
    console.log(JSON.stringify(map, null, 2));
}

main();
