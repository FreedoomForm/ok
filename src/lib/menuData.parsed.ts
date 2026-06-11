import type { DailyMenu } from './menuData'

export const MENUS: DailyMenu[] = [
  {
    "menuNumber": 1,
    "dishes": [
      {
        "id": 10,
        "name": "Balish (Pirog)",
        "mealType": "BREAKFAST",
        "ingredients": [
          {
            "name": "Xamir (Margarin/Qatiq/Un)",
            "amount": 71.4,
            "unit": "gr"
          },
          {
            "name": "Tovuq filesi",
            "amount": 45.7,
            "unit": "gr"
          },
          {
            "name": "Piyoz",
            "amount": 42.8,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 11,
        "name": "Qovoq tatlisi",
        "mealType": "SECOND_BREAKFAST",
        "ingredients": [
          {
            "name": "Qovoq",
            "amount": 150,
            "unit": "gr"
          },
          {
            "name": "Shakar",
            "amount": 15,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 12,
        "name": "Asosiy taom (Go'sht/Qo'ziqorin)",
        "mealType": "LUNCH",
        "ingredients": [
          {
            "name": "Mol go'shti",
            "amount": 85.7,
            "unit": "gr"
          },
          {
            "name": "Qo'ziqorin (Veshenka)",
            "amount": 100,
            "unit": "gr"
          },
          {
            "name": "Garnir (Grechka)",
            "amount": 42.8,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 13,
        "name": "Salat (Lavlagi)",
        "mealType": "SNACK",
        "ingredients": [
          {
            "name": "Lavlagi",
            "amount": 157,
            "unit": "gr"
          },
          {
            "name": "Yong'oq",
            "amount": 14.2,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 14,
        "name": "Tovuq sho'rva",
        "mealType": "DINNER",
        "ingredients": [
          {
            "name": "Tovuq soni",
            "amount": 50,
            "unit": "gr"
          },
          {
            "name": "Sabzavotlar (Sabzi/Bolgari/Kartoshka)",
            "amount": 60,
            "unit": "gr"
          }
        ]
      }
    ]
  },
  {
    "menuNumber": 2,
    "dishes": [
      {
        "id": 20,
        "name": "Tariq bo'tqasi",
        "mealType": "BREAKFAST",
        "ingredients": [
          {
            "name": "Tariq",
            "amount": 27.2,
            "unit": "gr"
          },
          {
            "name": "Sut",
            "amount": 54.5,
            "unit": "ml"
          },
          {
            "name": "Shakar",
            "amount": 10.9,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 21,
        "name": "Mazurka",
        "mealType": "SECOND_BREAKFAST",
        "ingredients": [
          {
            "name": "Yong'oq va mayiz aralashmasi",
            "amount": 66.6,
            "unit": "gr"
          },
          {
            "name": "Tuxum",
            "amount": 13.5,
            "unit": "gr (0.27 dona)"
          },
          {
            "name": "Shakar",
            "amount": 8.3,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 22,
        "name": "Tovuq kabob",
        "mealType": "LUNCH",
        "ingredients": [
          {
            "name": "Tovuq go'shti",
            "amount": 181.8,
            "unit": "gr"
          },
          {
            "name": "Mayonez/Soya",
            "amount": 15,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 23,
        "name": "Garnir",
        "mealType": "SNACK",
        "ingredients": [
          {
            "name": "Aralash sabzavotlar",
            "amount": 218,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 24,
        "name": "Omlet",
        "mealType": "DINNER",
        "ingredients": [
          {
            "name": "Tuxum",
            "amount": 2,
            "unit": "dona (110 gr)"
          },
          {
            "name": "Sabzavotlar (Gorox/Jo'xori/Brokkoli)",
            "amount": 40,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 25,
        "name": "Frikadelka sho'rva",
        "mealType": "UNKNOWN",
        "ingredients": [
          {
            "name": "Mol go'shti",
            "amount": 23.6,
            "unit": "gr"
          },
          {
            "name": "Guruch",
            "amount": 5,
            "unit": "gr"
          }
        ]
      }
    ]
  },
  {
    "menuNumber": 3,
    "dishes": [
      {
        "id": 30,
        "name": "Tovuqli blinchik",
        "mealType": "BREAKFAST",
        "ingredients": [
          {
            "name": "Sut",
            "amount": 75,
            "unit": "ml"
          },
          {
            "name": "Tovuq qiymasi",
            "amount": 25,
            "unit": "gr"
          },
          {
            "name": "Piyoz",
            "amount": 25,
            "unit": "gr"
          },
          {
            "name": "Un",
            "amount": 30,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 31,
        "name": "Tvorogli pirog",
        "mealType": "SECOND_BREAKFAST",
        "ingredients": [
          {
            "name": "Un",
            "amount": 46.5,
            "unit": "gr"
          },
          {
            "name": "Tvorog",
            "amount": 55.5,
            "unit": "gr"
          },
          {
            "name": "Smetana",
            "amount": 18.7,
            "unit": "gr"
          },
          {
            "name": "Saryog'",
            "amount": 11.8,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 32,
        "name": "Gulyash va Spagetti",
        "mealType": "LUNCH",
        "ingredients": [
          {
            "name": "Mol go'shti",
            "amount": 62.5,
            "unit": "gr"
          },
          {
            "name": "Sabzi",
            "amount": 25,
            "unit": "gr"
          },
          {
            "name": "Spagetti (quruq)",
            "amount": 50,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 33,
        "name": "Tulum salati",
        "mealType": "SNACK",
        "ingredients": [
          {
            "name": "Tvorog",
            "amount": 25,
            "unit": "gr"
          },
          {
            "name": "Olma",
            "amount": 100,
            "unit": "gr"
          },
          {
            "name": "Aysberg salati",
            "amount": 25,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 34,
        "name": "Terbiye sho'rva",
        "mealType": "DINNER",
        "ingredients": [
          {
            "name": "Tovuq soni",
            "amount": 25,
            "unit": "gr"
          },
          {
            "name": "Qatiq",
            "amount": 25,
            "unit": "ml"
          }
        ]
      }
    ]
  },
  {
    "menuNumber": 4,
    "dishes": [
      {
        "id": 40,
        "name": "Sutli zapekanka",
        "mealType": "BREAKFAST",
        "ingredients": [
          {
            "name": "Tuxum",
            "amount": 73,
            "unit": "gr (1.3 dona)"
          },
          {
            "name": "Vermeshel (Pautinka)",
            "amount": 18.5,
            "unit": "gr"
          },
          {
            "name": "Sut",
            "amount": 16.6,
            "unit": "ml"
          }
        ]
      },
      {
        "id": 41,
        "name": "Mevali assorti",
        "mealType": "SECOND_BREAKFAST",
        "ingredients": [
          {
            "name": "Meva",
            "amount": 166.6,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 42,
        "name": "Jigar va garnir",
        "mealType": "LUNCH",
        "ingredients": [
          {
            "name": "Jigar",
            "amount": 133.3,
            "unit": "gr"
          },
          {
            "name": "Kartoshka",
            "amount": 116.6,
            "unit": "gr"
          },
          {
            "name": "Kraxmal",
            "amount": 16.6,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 43,
        "name": "Tabule salati",
        "mealType": "SNACK",
        "ingredients": [
          {
            "name": "Bulg'ur",
            "amount": 33.3,
            "unit": "gr"
          },
          {
            "name": "Ko'katlar",
            "amount": 15,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 44,
        "name": "Borsh",
        "mealType": "DINNER",
        "ingredients": [
          {
            "name": "Lavlagi",
            "amount": 66.6,
            "unit": "gr"
          },
          {
            "name": "Karam",
            "amount": 50,
            "unit": "gr"
          },
          {
            "name": "Go'sht",
            "amount": 16.6,
            "unit": "gr"
          }
        ]
      }
    ]
  },
  {
    "menuNumber": 5,
    "dishes": [
      {
        "id": 50,
        "name": "Grechka kasha",
        "mealType": "BREAKFAST",
        "ingredients": [
          {
            "name": "Grechka",
            "amount": 35.7,
            "unit": "gr"
          },
          {
            "name": "Sut",
            "amount": 57.1,
            "unit": "ml"
          },
          {
            "name": "Shakar",
            "amount": 5.7,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 51,
        "name": "Shoko blinchik",
        "mealType": "SECOND_BREAKFAST",
        "ingredients": [
          {
            "name": "Tayyor blinchik massasi",
            "amount": 100,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 52,
        "name": "Buffalo qanotchalar",
        "mealType": "LUNCH",
        "ingredients": [
          {
            "name": "Tovuq qanotlari",
            "amount": 142.8,
            "unit": "gr"
          },
          {
            "name": "Garnir (Qizil sabzi)",
            "amount": 142.8,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 53,
        "name": "Suzmali salat",
        "mealType": "SNACK",
        "ingredients": [
          {
            "name": "Pomidor",
            "amount": 42.8,
            "unit": "gr"
          },
          {
            "name": "Bodring",
            "amount": 42.8,
            "unit": "gr"
          },
          {
            "name": "Suzma",
            "amount": 28.5,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 54,
        "name": "Mastava",
        "mealType": "DINNER",
        "ingredients": [
          {
            "name": "Guruch",
            "amount": 21.4,
            "unit": "gr"
          },
          {
            "name": "Go'sht",
            "amount": 14.3,
            "unit": "gr"
          },
          {
            "name": "Kartoshka",
            "amount": 42.8,
            "unit": "gr"
          }
        ]
      }
    ]
  },
  {
    "menuNumber": 6,
    "dishes": [
      {
        "id": 60,
        "name": "Skrembl (Tuxum)",
        "mealType": "BREAKFAST",
        "ingredients": [
          {
            "name": "Tuxum",
            "amount": 150,
            "unit": "gr (2.7 dona)"
          },
          {
            "name": "Ismaloq",
            "amount": 28.5,
            "unit": "gr"
          },
          {
            "name": "Pishloq",
            "amount": 10,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 61,
        "name": "Limonli maffin",
        "mealType": "SECOND_BREAKFAST",
        "ingredients": [
          {
            "name": "Un",
            "amount": 28.5,
            "unit": "gr"
          },
          {
            "name": "Qatiq",
            "amount": 42.8,
            "unit": "ml"
          },
          {
            "name": "Shakar",
            "amount": 8.5,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 62,
        "name": "Karni yarik (Baqlajon)",
        "mealType": "LUNCH",
        "ingredients": [
          {
            "name": "Baqlajon",
            "amount": 150,
            "unit": "gr (0.7 dona)"
          },
          {
            "name": "Go'sht qiymasi",
            "amount": 50,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 63,
        "name": "Nisuaz salati",
        "mealType": "SNACK",
        "ingredients": [
          {
            "name": "Salat massasi",
            "amount": 130,
            "unit": "gr"
          },
          {
            "name": "(Tovuq filesi",
            "amount": 42.8,
            "unit": "gr, Cherri"
          }
        ]
      },
      {
        "id": 64,
        "name": "Brokkoli sho'rva",
        "mealType": "DINNER",
        "ingredients": [
          {
            "name": "Brokkoli",
            "amount": 20,
            "unit": "gr"
          },
          {
            "name": "Makaron (Pautinka)",
            "amount": 12.8,
            "unit": "gr"
          }
        ]
      }
    ]
  },
  {
    "menuNumber": 7,
    "dishes": [
      {
        "id": 70,
        "name": "Fritata",
        "mealType": "BREAKFAST",
        "ingredients": [
          {
            "name": "Tuxum",
            "amount": 110,
            "unit": "gr (2 dona)"
          },
          {
            "name": "Indeyka",
            "amount": 10,
            "unit": "gr"
          },
          {
            "name": "Motsarella",
            "amount": 10,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 71,
        "name": "Tvorogli desert",
        "mealType": "SECOND_BREAKFAST",
        "ingredients": [
          {
            "name": "Tvorog",
            "amount": 100,
            "unit": "gr"
          },
          {
            "name": "Pechenye",
            "amount": 30,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 72,
        "name": "Baliqli kotlet",
        "mealType": "LUNCH",
        "ingredients": [
          {
            "name": "Baliq (Pangasius)",
            "amount": 142.8,
            "unit": "gr"
          },
          {
            "name": "Piyoz",
            "amount": 28.5,
            "unit": "gr"
          },
          {
            "name": "Garnir (Perlovka)",
            "amount": 42.8,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 73,
        "name": "Vinegret salati",
        "mealType": "SNACK",
        "ingredients": [
          {
            "name": "Lavlagi",
            "amount": 71.4,
            "unit": "gr"
          },
          {
            "name": "Kartoshka",
            "amount": 42.8,
            "unit": "gr"
          },
          {
            "name": "Sabzi",
            "amount": 28.5,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 74,
        "name": "Shi sho'rvasi",
        "mealType": "DINNER",
        "ingredients": [
          {
            "name": "Sabzi",
            "amount": 28.5,
            "unit": "gr"
          },
          {
            "name": "Kartoshka",
            "amount": 21.4,
            "unit": "gr"
          },
          {
            "name": "Shovul/Ko'kat",
            "amount": 10,
            "unit": "gr"
          }
        ]
      }
    ]
  },
  {
    "menuNumber": 8,
    "dishes": [
      {
        "id": 80,
        "name": "Ovsianka kasha",
        "mealType": "BREAKFAST",
        "ingredients": [
          {
            "name": "Suli yormasi",
            "amount": 31.2,
            "unit": "gr"
          },
          {
            "name": "Sut",
            "amount": 50,
            "unit": "ml"
          },
          {
            "name": "Shakar",
            "amount": 7.5,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 81,
        "name": "Shokoladli rulet",
        "mealType": "SECOND_BREAKFAST",
        "ingredients": [
          {
            "name": "Tuxum",
            "amount": 35.7,
            "unit": "gr (0.65 dona)"
          },
          {
            "name": "Un",
            "amount": 15,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 82,
        "name": "Brizol",
        "mealType": "LUNCH",
        "ingredients": [
          {
            "name": "Go'sht",
            "amount": 50,
            "unit": "gr"
          },
          {
            "name": "Tuxum",
            "amount": 55,
            "unit": "gr (1 dona)"
          },
          {
            "name": "Garnir (Bulg'ur)",
            "amount": 50,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 83,
        "name": "Sezar salati",
        "mealType": "SNACK",
        "ingredients": [
          {
            "name": "Tovuq filesi",
            "amount": 37.5,
            "unit": "gr"
          },
          {
            "name": "Pishloq",
            "amount": 10,
            "unit": "gr"
          },
          {
            "name": "Cherri pomidor",
            "amount": 37.5,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 84,
        "name": "Minestrone sho'rva",
        "mealType": "DINNER",
        "ingredients": [
          {
            "name": "Loviya",
            "amount": 25,
            "unit": "gr"
          },
          {
            "name": "Bolgar qalampiri",
            "amount": 50,
            "unit": "gr"
          }
        ]
      }
    ]
  },
  {
    "menuNumber": 9,
    "dishes": [
      {
        "id": 90,
        "name": "Shakshuka",
        "mealType": "BREAKFAST",
        "ingredients": [
          {
            "name": "Tuxum",
            "amount": 55,
            "unit": "gr (1 dona)"
          },
          {
            "name": "Pomidor",
            "amount": 37.5,
            "unit": "gr"
          },
          {
            "name": "Bolgar qalampiri",
            "amount": 50,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 91,
        "name": "Chia puding",
        "mealType": "SECOND_BREAKFAST",
        "ingredients": [
          {
            "name": "Chia urug'i",
            "amount": 20,
            "unit": "gr"
          },
          {
            "name": "Kefir",
            "amount": 125,
            "unit": "ml"
          }
        ]
      },
      {
        "id": 92,
        "name": "Tovuq soni va garnir",
        "mealType": "LUNCH",
        "ingredients": [
          {
            "name": "Tovuq soni (bedra)",
            "amount": 1,
            "unit": "dona"
          },
          {
            "name": "Kartoshka",
            "amount": 150,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 93,
        "name": "Olivye salati",
        "mealType": "SNACK",
        "ingredients": [
          {
            "name": "Kartoshka",
            "amount": 37.5,
            "unit": "gr"
          },
          {
            "name": "Tovuq go'shti",
            "amount": 37.5,
            "unit": "gr"
          },
          {
            "name": "Bodring",
            "amount": 25,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 94,
        "name": "Ezogelin sho'rva",
        "mealType": "DINNER",
        "ingredients": [
          {
            "name": "Yasmiq (Chechevitsa)",
            "amount": 25,
            "unit": "gr"
          },
          {
            "name": "Sabzi",
            "amount": 12.5,
            "unit": "gr"
          }
        ]
      }
    ]
  },
  {
    "menuNumber": 10,
    "dishes": [
      {
        "id": 100,
        "name": "Pshenka kasha",
        "mealType": "BREAKFAST",
        "ingredients": [
          {
            "name": "Tariq",
            "amount": 33.3,
            "unit": "gr"
          },
          {
            "name": "Sut",
            "amount": 50,
            "unit": "ml"
          }
        ]
      },
      {
        "id": 101,
        "name": "Brauni",
        "mealType": "SECOND_BREAKFAST",
        "ingredients": [
          {
            "name": "Tuxum",
            "amount": 36.6,
            "unit": "gr (0.66 dona)"
          },
          {
            "name": "Qatiq",
            "amount": 33.3,
            "unit": "ml"
          },
          {
            "name": "Yong'oq",
            "amount": 8.3,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 102,
        "name": "Kotlet va garnir",
        "mealType": "LUNCH",
        "ingredients": [
          {
            "name": "Go'sht (Mol+Tovuq)",
            "amount": 100,
            "unit": "gr"
          },
          {
            "name": "Garnir (Noxat)",
            "amount": 50,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 103,
        "name": "Ikra va xlebci",
        "mealType": "SNACK",
        "ingredients": [
          {
            "name": "Sabzavotli ikra",
            "amount": 60,
            "unit": "gr"
          },
          {
            "name": "Xlebci",
            "amount": 2,
            "unit": "dona"
          }
        ]
      },
      {
        "id": 104,
        "name": "Qo'ziqorinli sho'rva",
        "mealType": "DINNER",
        "ingredients": [
          {
            "name": "Qo'ziqorinlar",
            "amount": 116.6,
            "unit": "gr"
          },
          {
            "name": "Saryog'",
            "amount": 5,
            "unit": "gr"
          }
        ]
      }
    ]
  },
  {
    "menuNumber": 11,
    "dishes": [
      {
        "id": 110,
        "name": "Achma",
        "mealType": "BREAKFAST",
        "ingredients": [
          {
            "name": "Porsiya",
            "amount": 150,
            "unit": "gr"
          },
          {
            "name": "(Tarkibida",
            "amount": 37.5,
            "unit": "gr, Pishloq 18.7 gr)"
          }
        ]
      },
      {
        "id": 111,
        "name": "Vafli",
        "mealType": "SECOND_BREAKFAST",
        "ingredients": [
          {
            "name": "Qatiq",
            "amount": 37.5,
            "unit": "ml"
          },
          {
            "name": "Tuxum",
            "amount": 17,
            "unit": "gr (0.3 dona)"
          }
        ]
      },
      {
        "id": 112,
        "name": "Tovuq rulet",
        "mealType": "LUNCH",
        "ingredients": [
          {
            "name": "Tovuq filesi",
            "amount": 125,
            "unit": "gr"
          },
          {
            "name": "Sabzi",
            "amount": 37.5,
            "unit": "gr"
          },
          {
            "name": "Ismaloq",
            "amount": 12.5,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 113,
        "name": "Tulum salati",
        "mealType": "SNACK",
        "ingredients": [
          {
            "name": "Tvorog",
            "amount": 50,
            "unit": "gr"
          },
          {
            "name": "Aysberg",
            "amount": 43.7,
            "unit": "gr"
          },
          {
            "name": "Olma",
            "amount": 37.5,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 114,
        "name": "Terbiye sho'rva",
        "mealType": "DINNER",
        "ingredients": [
          {
            "name": "Tovuq go'shti",
            "amount": 37.5,
            "unit": "gr"
          },
          {
            "name": "Qatiq",
            "amount": 25,
            "unit": "ml"
          }
        ]
      }
    ]
  },
  {
    "menuNumber": 12,
    "dishes": [
      {
        "id": 120,
        "name": "Kesadilya",
        "mealType": "BREAKFAST",
        "ingredients": [
          {
            "name": "Tortilya/Lavash",
            "amount": 1,
            "unit": "dona"
          },
          {
            "name": "Motsarella",
            "amount": 25,
            "unit": "gr"
          },
          {
            "name": "Bolgar qalampiri",
            "amount": 50,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 121,
        "name": "Sharlotka",
        "mealType": "SECOND_BREAKFAST",
        "ingredients": [
          {
            "name": "Olma",
            "amount": 50,
            "unit": "gr"
          },
          {
            "name": "Xamir",
            "amount": 50,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 122,
        "name": "Bulg'ur palov",
        "mealType": "LUNCH",
        "ingredients": [
          {
            "name": "Go'sht",
            "amount": 50,
            "unit": "gr"
          },
          {
            "name": "Bulg'ur",
            "amount": 50,
            "unit": "gr"
          },
          {
            "name": "Sabzi",
            "amount": 75,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 123,
        "name": "Xumus",
        "mealType": "SNACK",
        "ingredients": [
          {
            "name": "Noxat (Xumus)",
            "amount": 50,
            "unit": "gr"
          },
          {
            "name": "Xlebci",
            "amount": 2,
            "unit": "dona"
          }
        ]
      },
      {
        "id": 124,
        "name": "Qizil sabzi sho'rva",
        "mealType": "DINNER",
        "ingredients": [
          {
            "name": "Sabzi",
            "amount": 62.5,
            "unit": "gr"
          },
          {
            "name": "Kartoshka",
            "amount": 25,
            "unit": "gr"
          },
          {
            "name": "Sosiska",
            "amount": 12.5,
            "unit": "gr"
          }
        ]
      }
    ]
  },
  {
    "menuNumber": 13,
    "dishes": [
      {
        "id": 130,
        "name": "Bug'doy kasha",
        "mealType": "BREAKFAST",
        "ingredients": [
          {
            "name": "Bug'doy yormasi",
            "amount": 29.4,
            "unit": "gr"
          },
          {
            "name": "Sut",
            "amount": 47,
            "unit": "ml"
          }
        ]
      },
      {
        "id": 131,
        "name": "Ovsianka pechenye",
        "mealType": "SECOND_BREAKFAST",
        "ingredients": [
          {
            "name": "Suli yormasi",
            "amount": 25.8,
            "unit": "gr"
          },
          {
            "name": "Shakar",
            "amount": 25.8,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 132,
        "name": "Frikase",
        "mealType": "LUNCH",
        "ingredients": [
          {
            "name": "Tovuq go'shti",
            "amount": 100,
            "unit": "gr"
          },
          {
            "name": "Qo'ziqorin",
            "amount": 52.9,
            "unit": "gr"
          },
          {
            "name": "Qaymoq",
            "amount": 23.5,
            "unit": "ml"
          }
        ]
      },
      {
        "id": 133,
        "name": "Lavlagi salati",
        "mealType": "SNACK",
        "ingredients": [
          {
            "name": "Lavlagi",
            "amount": 141.1,
            "unit": "gr"
          },
          {
            "name": "Brinza",
            "amount": 29.4,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 134,
        "name": "Til sho'rva",
        "mealType": "DINNER",
        "ingredients": [
          {
            "name": "Go'sht va Til",
            "amount": 23.5,
            "unit": "gr"
          },
          {
            "name": "Qaymoq",
            "amount": 5.8,
            "unit": "gr"
          }
        ]
      }
    ]
  },
  {
    "menuNumber": 14,
    "dishes": [
      {
        "id": 140,
        "name": "Tvorog nonushta",
        "mealType": "BREAKFAST",
        "ingredients": [
          {
            "name": "Tvorog",
            "amount": 120,
            "unit": "gr"
          },
          {
            "name": "Smetana",
            "amount": 30,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 141,
        "name": "Medovik",
        "mealType": "SECOND_BREAKFAST",
        "ingredients": [
          {
            "name": "Sut",
            "amount": 32,
            "unit": "ml"
          },
          {
            "name": "Saryog'",
            "amount": 9.6,
            "unit": "gr"
          },
          {
            "name": "Un",
            "amount": 45,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 142,
        "name": "Hasanposho kofte",
        "mealType": "LUNCH",
        "ingredients": [
          {
            "name": "Go'sht",
            "amount": 47,
            "unit": "gr"
          },
          {
            "name": "Piyoz",
            "amount": 23.5,
            "unit": "gr"
          },
          {
            "name": "Garnir (Guruch)",
            "amount": 47,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 143,
        "name": "Fransuzcha salat",
        "mealType": "SNACK",
        "ingredients": [
          {
            "name": "Tovuq",
            "amount": 35.2,
            "unit": "gr"
          },
          {
            "name": "Lavlagi",
            "amount": 35.2,
            "unit": "gr"
          },
          {
            "name": "Karam",
            "amount": 35.2,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 144,
        "name": "Yashil sho'rva",
        "mealType": "DINNER",
        "ingredients": [
          {
            "name": "Saryog'",
            "amount": 11.7,
            "unit": "gr"
          },
          {
            "name": "Ismaloq/Ko'kat",
            "amount": 20,
            "unit": "gr"
          }
        ]
      }
    ]
  },
  {
    "menuNumber": 15,
    "dishes": [
      {
        "id": 150,
        "name": "Shokoladli kasha",
        "mealType": "BREAKFAST",
        "ingredients": [
          {
            "name": "Suli yormasi",
            "amount": 29.4,
            "unit": "gr"
          },
          {
            "name": "Sut",
            "amount": 47,
            "unit": "ml"
          }
        ]
      },
      {
        "id": 151,
        "name": "Chizkeyk",
        "mealType": "SECOND_BREAKFAST",
        "ingredients": [
          {
            "name": "Pishloq (Kalleh)",
            "amount": 24.3,
            "unit": "gr"
          },
          {
            "name": "Pechenye",
            "amount": 20.8,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 152,
        "name": "Tovuksay",
        "mealType": "LUNCH",
        "ingredients": [
          {
            "name": "Tovuq filesi",
            "amount": 82.3,
            "unit": "gr"
          },
          {
            "name": "Sabzavotlar (Karam/Daykon)",
            "amount": 100,
            "unit": "gr"
          },
          {
            "name": "Garnir (Bulg'ur)",
            "amount": 47,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 153,
        "name": "Baqlajon salat",
        "mealType": "SNACK",
        "ingredients": [
          {
            "name": "Baqlajon",
            "amount": 176,
            "unit": "gr"
          },
          {
            "name": "Pomidor",
            "amount": 35.2,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 154,
        "name": "Frikadelka sho'rva",
        "mealType": "DINNER",
        "ingredients": [
          {
            "name": "Tovuq filesi",
            "amount": 29.4,
            "unit": "gr"
          },
          {
            "name": "Saryog'",
            "amount": 3.5,
            "unit": "gr"
          }
        ]
      }
    ]
  },
  {
    "menuNumber": 16,
    "dishes": [
      {
        "id": 160,
        "name": "Omlet",
        "mealType": "BREAKFAST",
        "ingredients": [
          {
            "name": "Tuxum",
            "amount": 63,
            "unit": "gr (1.14 dona)"
          },
          {
            "name": "Motsarella",
            "amount": 14.2,
            "unit": "gr"
          },
          {
            "name": "Sut",
            "amount": 28.5,
            "unit": "ml"
          }
        ]
      },
      {
        "id": 161,
        "name": "Trileche",
        "mealType": "SECOND_BREAKFAST",
        "ingredients": [
          {
            "name": "Sut",
            "amount": 28.5,
            "unit": "ml"
          },
          {
            "name": "Tuxum",
            "amount": 31,
            "unit": "gr (0.57 dona)"
          },
          {
            "name": "Karamel",
            "amount": 28.5,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 162,
        "name": "Lyulya kabob",
        "mealType": "LUNCH",
        "ingredients": [
          {
            "name": "Mol go'shti",
            "amount": 85.7,
            "unit": "gr"
          },
          {
            "name": "Piyoz",
            "amount": 14.2,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 163,
        "name": "Garnir",
        "mealType": "SNACK",
        "ingredients": [
          {
            "name": "Spagetti",
            "amount": 50,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 164,
        "name": "Lavlagi salati",
        "mealType": "DINNER",
        "ingredients": [
          {
            "name": "Lavlagi",
            "amount": 57.1,
            "unit": "gr"
          },
          {
            "name": "Olma",
            "amount": 71.4,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 165,
        "name": "Chuchvarali sho'rva",
        "mealType": "UNKNOWN",
        "ingredients": [
          {
            "name": "Kartoshka",
            "amount": 50,
            "unit": "gr"
          },
          {
            "name": "Sabzi",
            "amount": 42.8,
            "unit": "gr"
          }
        ]
      }
    ]
  },
  {
    "menuNumber": 17,
    "dishes": [
      {
        "id": 170,
        "name": "Sendvich",
        "mealType": "BREAKFAST",
        "ingredients": [
          {
            "name": "Toster non",
            "amount": 2,
            "unit": "bo'lak"
          },
          {
            "name": "Tovuq filesi",
            "amount": 40,
            "unit": "gr"
          },
          {
            "name": "Bodring",
            "amount": 40,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 171,
        "name": "Shokoladli vafli",
        "mealType": "SECOND_BREAKFAST",
        "ingredients": [
          {
            "name": "Qatiq",
            "amount": 60,
            "unit": "ml"
          },
          {
            "name": "Tuxum",
            "amount": 13,
            "unit": "gr (0.24 dona)"
          },
          {
            "name": "Shakar",
            "amount": 16,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 172,
        "name": "Tovuqli kotlet",
        "mealType": "LUNCH",
        "ingredients": [
          {
            "name": "Tovuq filesi",
            "amount": 100,
            "unit": "gr"
          },
          {
            "name": "Motsarella",
            "amount": 10,
            "unit": "gr"
          },
          {
            "name": "Garnir (Grechka)",
            "amount": 60,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 173,
        "name": "Pashtet",
        "mealType": "SNACK",
        "ingredients": [
          {
            "name": "Tovuq jigari",
            "amount": 30,
            "unit": "gr"
          },
          {
            "name": "Xlebci",
            "amount": 2,
            "unit": "dona"
          }
        ]
      },
      {
        "id": 174,
        "name": "Rassolnik sho'rva",
        "mealType": "DINNER",
        "ingredients": [
          {
            "name": "Perlovka",
            "amount": 30,
            "unit": "gr"
          },
          {
            "name": "Sho'r bodring/pomidor",
            "amount": 40,
            "unit": "gr"
          }
        ]
      }
    ]
  },
  {
    "menuNumber": 18,
    "dishes": [
      {
        "id": 180,
        "name": "Ovsianka Kefirda",
        "mealType": "BREAKFAST",
        "ingredients": [
          {
            "name": "Suli yormasi",
            "amount": 30,
            "unit": "gr"
          },
          {
            "name": "Kefir",
            "amount": 150,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 181,
        "name": "Shokoladli maffin",
        "mealType": "SECOND_BREAKFAST",
        "ingredients": [
          {
            "name": "Un",
            "amount": 42.8,
            "unit": "gr"
          },
          {
            "name": "Kefir",
            "amount": 42.8,
            "unit": "ml"
          },
          {
            "name": "Tuxum",
            "amount": 15,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 182,
        "name": "Do'lma",
        "mealType": "LUNCH",
        "ingredients": [
          {
            "name": "Tok bargi",
            "amount": 8,
            "unit": "-9 dona"
          },
          {
            "name": "Go'sht",
            "amount": 42.8,
            "unit": "gr"
          },
          {
            "name": "Bulg'ur",
            "amount": 42.8,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 183,
        "name": "Salat",
        "mealType": "SNACK",
        "ingredients": [
          {
            "name": "Pomidor",
            "amount": 50,
            "unit": "gr"
          },
          {
            "name": "Bodring",
            "amount": 50,
            "unit": "gr"
          },
          {
            "name": "Bedana tuxum",
            "amount": 2,
            "unit": "dona"
          }
        ]
      },
      {
        "id": 184,
        "name": "Qovoq sho'rva",
        "mealType": "DINNER",
        "ingredients": [
          {
            "name": "Qovoq",
            "amount": 100,
            "unit": "gr"
          },
          {
            "name": "Piyoz",
            "amount": 14.2,
            "unit": "gr"
          }
        ]
      }
    ]
  },
  {
    "menuNumber": 19,
    "dishes": [
      {
        "id": 190,
        "name": "Arpa kashasi",
        "mealType": "BREAKFAST",
        "ingredients": [
          {
            "name": "Arpa yormasi",
            "amount": 30,
            "unit": "gr"
          },
          {
            "name": "Sut",
            "amount": 57.1,
            "unit": "ml"
          }
        ]
      },
      {
        "id": 191,
        "name": "Bananli blinchik",
        "mealType": "SECOND_BREAKFAST",
        "ingredients": [
          {
            "name": "Banan",
            "amount": 42.8,
            "unit": "gr"
          },
          {
            "name": "Pishloq (Kalleh)",
            "amount": 28.5,
            "unit": "gr"
          },
          {
            "name": "Tuxum",
            "amount": 39,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 192,
        "name": "Kiyev kotleti",
        "mealType": "LUNCH",
        "ingredients": [
          {
            "name": "Tovuq filesi",
            "amount": 100,
            "unit": "gr"
          },
          {
            "name": "Motsarella",
            "amount": 21.4,
            "unit": "gr"
          },
          {
            "name": "Garnir (Perlovka)",
            "amount": 35.7,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 193,
        "name": "Mavsumiy salat",
        "mealType": "SNACK",
        "ingredients": [
          {
            "name": "Sabzi",
            "amount": 42.8,
            "unit": "gr"
          },
          {
            "name": "Bodring",
            "amount": 42.8,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 194,
        "name": "Qo'ziqorin sho'rva",
        "mealType": "DINNER",
        "ingredients": [
          {
            "name": "Qo'ziqorin",
            "amount": 71.4,
            "unit": "gr"
          },
          {
            "name": "Sut",
            "amount": 14.2,
            "unit": "ml"
          }
        ]
      }
    ]
  },
  {
    "menuNumber": 20,
    "dishes": [
      {
        "id": 200,
        "name": "Sirniki",
        "mealType": "BREAKFAST",
        "ingredients": [
          {
            "name": "Tvorog",
            "amount": 100,
            "unit": "gr"
          },
          {
            "name": "Shakar",
            "amount": 21.4,
            "unit": "gr"
          },
          {
            "name": "Kraxmal",
            "amount": 14.2,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 201,
        "name": "Granola",
        "mealType": "SECOND_BREAKFAST",
        "ingredients": [
          {
            "name": "Granola",
            "amount": 50,
            "unit": "gr"
          },
          {
            "name": "Kefir/Yogurt",
            "amount": 60,
            "unit": "ml"
          },
          {
            "name": "Yong'oq/Mayiz",
            "amount": 21.4,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 202,
        "name": "Bif Burginyon",
        "mealType": "LUNCH",
        "ingredients": [
          {
            "name": "Mol go'shti",
            "amount": 71.4,
            "unit": "gr"
          },
          {
            "name": "Kartoshka",
            "amount": 142.8,
            "unit": "gr"
          },
          {
            "name": "Qo'ziqorin",
            "amount": 42.8,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 203,
        "name": "Sushi (Kimpab)",
        "mealType": "SNACK",
        "ingredients": [
          {
            "name": "Soni",
            "amount": 4,
            "unit": "dona"
          },
          {
            "name": "Tovuq filesi",
            "amount": 28.5,
            "unit": "gr"
          },
          {
            "name": "Bodring",
            "amount": 28.5,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 204,
        "name": "Chechevitsa sho'rva",
        "mealType": "DINNER",
        "ingredients": [
          {
            "name": "Yasmiq",
            "amount": 31.4,
            "unit": "gr"
          },
          {
            "name": "Yog'",
            "amount": 4.2,
            "unit": "gr"
          }
        ]
      }
    ]
  },
  {
    "menuNumber": 21,
    "dishes": [
      {
        "id": 210,
        "name": "Glazunya",
        "mealType": "BREAKFAST",
        "ingredients": [
          {
            "name": "Tuxum",
            "amount": 2.7,
            "unit": "dona (148 gr)"
          },
          {
            "name": "Qora non",
            "amount": 50,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 211,
        "name": "Apelsinli maffin",
        "mealType": "SECOND_BREAKFAST",
        "ingredients": [
          {
            "name": "Un",
            "amount": 42.8,
            "unit": "gr"
          },
          {
            "name": "Qatiq",
            "amount": 42.8,
            "unit": "ml"
          },
          {
            "name": "Tuxum",
            "amount": 15,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 212,
        "name": "Dalan kofte",
        "mealType": "LUNCH",
        "ingredients": [
          {
            "name": "Tovuq filesi",
            "amount": 85.7,
            "unit": "gr"
          },
          {
            "name": "Piyoz",
            "amount": 28.5,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 213,
        "name": "Sabzavotli garnir",
        "mealType": "SNACK",
        "ingredients": [
          {
            "name": "Baqlajon",
            "amount": 57.1,
            "unit": "gr"
          },
          {
            "name": "Qovoqcha",
            "amount": 57.1,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 214,
        "name": "Tofu salati",
        "mealType": "DINNER",
        "ingredients": [
          {
            "name": "Tofu",
            "amount": 40,
            "unit": "gr"
          },
          {
            "name": "Bodring",
            "amount": 28.5,
            "unit": "gr"
          },
          {
            "name": "Pomidor",
            "amount": 28.5,
            "unit": "gr"
          }
        ]
      },
      {
        "id": 215,
        "name": "Pishloqli sho'rva",
        "mealType": "UNKNOWN",
        "ingredients": [
          {
            "name": "Sosiska/Indeyka",
            "amount": 11.4,
            "unit": "gr"
          },
          {
            "name": "Pishloqlar",
            "amount": 10,
            "unit": "gr"
          },
          {
            "name": "Sut",
            "amount": 14.2,
            "unit": "ml"
          }
        ]
      }
    ]
  }
];
