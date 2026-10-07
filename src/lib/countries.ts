/**
 * ISO 3166-1 alpha-2, with names and demonyms in both languages.
 *
 * Generated from the `world-countries` dataset and committed rather than
 * installed: it is 250 fixed rows that change about once a decade, so a
 * dependency would buy nothing and cost a megabyte in the bundle. The package
 * was removed after generating this.
 *
 * Why codes are what we store: the documents are bilingual, so one code has to
 * render both halves of "French / Française"; labels drift where codes do not;
 * and a code can be searched and compared.
 *
 * ---- Which gender to print ----
 *
 * French wants the adjective after "nationalité", and the adjective agrees
 * with that noun rather than with the person: "nationalité française" whoever
 * holds it. The feminine column is therefore the one to print.
 *
 * It is safe to do so because this dataset's feminines are adjectival, not the
 * nouns one might fear — checked on the case that would have broken it, since
 * Switzerland is a nationality this agency actually sees:
 *
 *   FR   m "Français"   f "Française"    → "nationalité française"
 *   CH   m "Suisse"     f "Suisse"       → "nationalité suisse", not "suissesse"
 *
 * 212 of the 250 carry a distinct feminine; the rest are invariable. Sixteen
 * territories have no demonym at all (Guam, Isle of Man, the Cocos Islands…),
 * and `nationalityLabel` falls back to the country's name for those — which
 * reads as "Manx / Île de Man", mixing a demonym with a place. Nobody is born
 * a national of those sixteen in practice, so it is left rather than papered
 * over with a translation nobody checked.
 *
 * Sorted by French name, which is the order the interface lists them in.
 */

export type Country = {
  /** ISO 3166-1 alpha-2. */
  code: string;
  /** Country name, French. */
  fr: string;
  /** Country name, English. */
  en: string;
  /** Demonym, French masculine — "Français", "Suisse". May be empty. */
  demonymFrM: string;
  /** Demonym, French feminine — "Française", "Suissesse". May be empty. */
  demonymFrF: string;
  /** Demonym, English — "French", "Swiss". May be empty. */
  demonymEn: string;
};

type Row = readonly [string, string, string, string, string, string];

const ROWS: readonly Row[] = [
  ["AF", "Afghanistan", "Afghanistan", "Afghan", "Afghane", "Afghan"],
  ["ZA", "Afrique du Sud", "South Africa", "Sud-africain", "Sud-africaine", "South African"],
  ["AX", "Ahvenanmaa", "Åland Islands", "Ålandais", "Ålandaise", "Ålandish"],
  ["AL", "Albanie", "Albania", "Albanais", "Albanaise", "Albanian"],
  ["DZ", "Algérie", "Algeria", "Algérien", "Algérienne", "Algerian"],
  ["DE", "Allemagne", "Germany", "Allemand", "Allemande", "German"],
  ["AD", "Andorre", "Andorra", "Andorran", "Andorrane", "Andorran"],
  ["AO", "Angola", "Angola", "Angolais", "Angolaise", "Angolan"],
  ["AI", "Anguilla", "Anguilla", "Anguillan", "Anguillane", "Anguillian"],
  ["AQ", "Antarctique", "Antarctica", "Antarcticain", "Antarcticaine", "Antarctican"],
  ["AG", "Antigua-et-Barbuda", "Antigua and Barbuda", "Antiguaise et barbudien", "Antiguaise et barbudienne", "Antiguan, Barbudan"],
  ["SA", "Arabie Saoudite", "Saudi Arabia", "Saoudien", "Saoudienne", "Saudi Arabian"],
  ["AR", "Argentine", "Argentina", "Argentin", "Argentine", "Argentine"],
  ["AM", "Arménie", "Armenia", "Arménien", "Arménienne", "Armenian"],
  ["AW", "Aruba", "Aruba", "Arubais", "Arubaise", "Aruban"],
  ["AU", "Australie", "Australia", "Australien", "Australienne", "Australian"],
  ["AT", "Autriche", "Austria", "Autrichien", "Autrichienne", "Austrian"],
  ["AZ", "Azerbaïdjan", "Azerbaijan", "Azerbaïdjanais", "Azerbaïdjanaise", "Azerbaijani"],
  ["BS", "Bahamas", "Bahamas", "Bahamien", "Bahamienne", "Bahamian"],
  ["BH", "Bahreïn", "Bahrain", "Bahreïnien", "Bahreïnienne", "Bahraini"],
  ["BD", "Bangladesh", "Bangladesh", "Bangladais", "Bangladaise", "Bangladeshi"],
  ["BB", "Barbade", "Barbados", "Barbadien", "Barbadienne", "Barbadian"],
  ["BE", "Belgique", "Belgium", "Belge", "Belge", "Belgian"],
  ["BZ", "Belize", "Belize", "Bélizien", "Bélizienne", "Belizean"],
  ["BJ", "Bénin", "Benin", "Béninois", "Béninoise", "Beninese"],
  ["BM", "Bermudes", "Bermuda", "Bermudien", "Bermudienne", "Bermudian"],
  ["BT", "Bhoutan", "Bhutan", "Bhoutanais", "Bhoutanaise", "Bhutanese"],
  ["BY", "Biélorussie", "Belarus", "Biélorusse", "Biélorusse", "Belarusian"],
  ["MM", "Birmanie", "Myanmar", "Birman", "Birmane", "Burmese"],
  ["BO", "Bolivie", "Bolivia", "Bolivien", "Bolivienne", "Bolivian"],
  ["BA", "Bosnie-Herzégovine", "Bosnia and Herzegovina", "Bosnien", "Bosnienne", "Bosnian, Herzegovinian"],
  ["BW", "Botswana", "Botswana", "Botswanais", "Botswanaise", "Motswana"],
  ["BR", "Brésil", "Brazil", "Brésilien", "Brésilienne", "Brazilian"],
  ["BN", "Brunei", "Brunei", "Brunéien", "Brunéienne", "Bruneian"],
  ["BG", "Bulgarie", "Bulgaria", "Bulgare", "Bulgare", "Bulgarian"],
  ["BF", "Burkina Faso", "Burkina Faso", "Burkinabé", "Burkinabée", "Burkinabe"],
  ["BI", "Burundi", "Burundi", "Burundais", "Burundaise", "Burundian"],
  ["KH", "Cambodge", "Cambodia", "Cambodgien", "Cambodgienne", "Cambodian"],
  ["CM", "Cameroun", "Cameroon", "Camerounais", "Camerounaise", "Cameroonian"],
  ["CA", "Canada", "Canada", "Canadien", "Canadienne", "Canadian"],
  ["CL", "Chili", "Chile", "Chilien", "Chilienne", "Chilean"],
  ["CN", "Chine", "China", "Chinois", "Chinoise", "Chinese"],
  ["CY", "Chypre", "Cyprus", "Chypriote", "Chypriote", "Cypriot"],
  ["VA", "Cité du Vatican", "Vatican City", "Vatican", "Vaticane", "Vatican"],
  ["CO", "Colombie", "Colombia", "Colombien", "Colombienne", "Colombian"],
  ["KM", "Comores", "Comoros", "Comorien", "Comorienne", "Comoran"],
  ["CG", "Congo", "Republic of the Congo", "Congolais", "Congolaise", "Congolese"],
  ["CD", "Congo (Rép. dém.)", "DR Congo", "Congolais", "Congolaise", "Congolese"],
  ["KP", "Corée du Nord", "North Korea", "Nord-coréen", "Nord-coréenne", "North Korean"],
  ["KR", "Corée du Sud", "South Korea", "Sud-coréen", "Sud-coréenne", "South Korean"],
  ["CR", "Costa Rica", "Costa Rica", "Costaricain", "Costaricaine", "Costa Rican"],
  ["CI", "Côte d'Ivoire", "Ivory Coast", "Ivoirien", "Ivoirienne", "Ivorian"],
  ["HR", "Croatie", "Croatia", "Croate", "Croate", "Croatian"],
  ["CU", "Cuba", "Cuba", "Cubain", "Cubaine", "Cuban"],
  ["CW", "Curaçao", "Curaçao", "Curacien", "Curacienne", "Curaçaoan"],
  ["DK", "Danemark", "Denmark", "Danois", "Danoise", "Danish"],
  ["DJ", "Djibouti", "Djibouti", "Djiboutien", "Djiboutienne", "Djibouti"],
  ["DM", "Dominique", "Dominica", "Dominiquais", "Dominiquaise", "Dominican"],
  ["EG", "Égypte", "Egypt", "Égyptien", "Égyptienne", "Egyptian"],
  ["AE", "Émirats arabes unis", "United Arab Emirates", "Emirien", "Emirienne", "Emirati"],
  ["EC", "Équateur", "Ecuador", "Équatorien", "Équatorienne", "Ecuadorean"],
  ["ER", "Érythrée", "Eritrea", "Érythréen", "Érythréenne", "Eritrean"],
  ["ES", "Espagne", "Spain", "Espagnol", "Espagnole", "Spanish"],
  ["EE", "Estonie", "Estonia", "Estonien", "Estonienne", "Estonian"],
  ["US", "États-Unis", "United States", "Américain", "Américaine", "American"],
  ["ET", "Éthiopie", "Ethiopia", "Éthiopien", "Éthiopienne", "Ethiopian"],
  ["FJ", "Fidji", "Fiji", "Fidjien", "Fidjienne", "Fijian"],
  ["FI", "Finlande", "Finland", "Finlandais", "Finlandaise", "Finnish"],
  ["FR", "France", "France", "Français", "Française", "French"],
  ["GA", "Gabon", "Gabon", "Gabonais", "Gabonaise", "Gabonese"],
  ["GM", "Gambie", "Gambia", "Gambien", "Gambienne", "Gambian"],
  ["GE", "Géorgie", "Georgia", "Géorgien", "Géorgienne", "Georgian"],
  ["GS", "Géorgie du Sud-et-les Îles Sandwich du Sud", "South Georgia", "", "", "South Georgian South Sandwich Islander"],
  ["GH", "Ghana", "Ghana", "Ghanéen", "Ghanéenne", "Ghanaian"],
  ["GI", "Gibraltar", "Gibraltar", "Gibraltarien", "Gibraltarienne", "Gibraltar"],
  ["GR", "Grèce", "Greece", "Grec", "Grecque", "Greek"],
  ["GD", "Grenade", "Grenada", "Grenadien", "Grenadienne", "Grenadian"],
  ["GL", "Groenland", "Greenland", "Groenlandais", "Groenlandaise", "Greenlandic"],
  ["GP", "Guadeloupe", "Guadeloupe", "Guadeloupéen", "Guadeloupéenne", "Guadeloupian"],
  ["GU", "Guam", "Guam", "", "", "Guamanian"],
  ["GT", "Guatemala", "Guatemala", "Guatémaltèque", "Guatémaltèque", "Guatemalan"],
  ["GG", "Guernesey", "Guernsey", "Guernesiais", "Guernesiaise", "Channel Islander"],
  ["GN", "Guinée", "Guinea", "Guinéen", "Guinéenne", "Guinean"],
  ["GQ", "Guinée équatoriale", "Equatorial Guinea", "Équato-guinéen", "Équato-guinéenne", "Equatorial Guinean"],
  ["GW", "Guinée-Bissau", "Guinea-Bissau", "Bissau-Guinéen", "Bissau-Guinéenne", "Guinea-Bissauan"],
  ["GY", "Guyana", "Guyana", "Guyanien", "Guyanienne", "Guyanese"],
  ["GF", "Guyane", "French Guiana", "Guyanais", "Guyanaise", "Guianan"],
  ["HT", "Haïti", "Haiti", "Haïtien", "Haïtienne", "Haitian"],
  ["HN", "Honduras", "Honduras", "Hondurien", "Hondurienne", "Honduran"],
  ["HK", "Hong Kong", "Hong Kong", "Hongkongais", "Hongkongaise", "Hong Konger"],
  ["HU", "Hongrie", "Hungary", "Hongrois", "Hongroise", "Hungarian"],
  ["BV", "Île Bouvet", "Bouvet Island", "", "", ""],
  ["CX", "Île Christmas", "Christmas Island", "", "", "Christmas Islander"],
  ["IM", "Île de Man", "Isle of Man", "", "", "Manx"],
  ["MU", "Île Maurice", "Mauritius", "Mauricien", "Mauricienne", "Mauritian"],
  ["NF", "Île Norfolk", "Norfolk Island", "Norfolkais", "Norfolkaise", "Norfolk Islander"],
  ["KY", "Îles Caïmans", "Cayman Islands", "Caïmanien", "Caïmanienne", "Caymanian"],
  ["CC", "Îles Cocos", "Cocos (Keeling) Islands", "", "", "Cocos Islander"],
  ["CK", "Îles Cook", "Cook Islands", "Cookien", "Cookienne", "Cook Islander"],
  ["CV", "Îles du Cap-Vert", "Cape Verde", "Cap-verdien", "Cap-verdienne", "Cape Verdian"],
  ["FO", "Îles Féroé", "Faroe Islands", "Féroïen", "Féroïenne", "Faroese"],
  ["HM", "Îles Heard-et-MacDonald", "Heard Island and McDonald Islands", "", "", "Heard and McDonald Islander"],
  ["FK", "Îles Malouines", "Falkland Islands", "Malouin", "Malouinne", "Falkland Islander"],
  ["MP", "Îles Mariannes du Nord", "Northern Mariana Islands", "Américan", "Américaine", "American"],
  ["MH", "Îles Marshall", "Marshall Islands", "Marshallais", "Marshallaise", "Marshallese"],
  ["UM", "Îles mineures éloignées des États-Unis", "United States Minor Outlying Islands", "", "", "American Islander"],
  ["PN", "Îles Pitcairn", "Pitcairn Islands", "Pitcairnais", "Pitcairnaise", "Pitcairn Islander"],
  ["SB", "Îles Salomon", "Solomon Islands", "Salomonien", "Salomonienne", "Solomon Islander"],
  ["TC", "Îles Turques-et-Caïques", "Turks and Caicos Islands", "", "", "Turks and Caicos Islander"],
  ["VG", "Îles Vierges britanniques", "British Virgin Islands", "", "", "Virgin Islander"],
  ["VI", "Îles Vierges des États-Unis", "United States Virgin Islands", "", "", "Virgin Islander"],
  ["IN", "Inde", "India", "Indien", "Indienne", "Indian"],
  ["ID", "Indonésie", "Indonesia", "Indonésien", "Indonésienne", "Indonesian"],
  ["IQ", "Irak", "Iraq", "Irakien", "Irakienne", "Iraqi"],
  ["IR", "Iran", "Iran", "Iranien", "Iranienne", "Iranian"],
  ["IE", "Irlande", "Ireland", "Irlandais", "Irlandaise", "Irish"],
  ["IS", "Islande", "Iceland", "Islandais", "Islandaise", "Icelander"],
  ["IL", "Israël", "Israel", "Israélien", "Israélienne", "Israeli"],
  ["IT", "Italie", "Italy", "Italien", "Italienne", "Italian"],
  ["JM", "Jamaïque", "Jamaica", "Jamaïcain", "Jamaïcaine", "Jamaican"],
  ["JP", "Japon", "Japan", "Japonais", "Japonaise", "Japanese"],
  ["JE", "Jersey", "Jersey", "Jersiais", "Jersiaise", "Channel Islander"],
  ["JO", "Jordanie", "Jordan", "Jordanien", "Jordanienne", "Jordanian"],
  ["KZ", "Kazakhstan", "Kazakhstan", "Kazakhstanais", "Kazakhstanaise", "Kazakhstani"],
  ["KE", "Kenya", "Kenya", "Kényan", "Kényane", "Kenyan"],
  ["KG", "Kirghizistan", "Kyrgyzstan", "Kirghize", "Kirghize", "Kirghiz"],
  ["KI", "Kiribati", "Kiribati", "Kiribatien", "Kiribatienne", "I-Kiribati"],
  ["XK", "Kosovo", "Kosovo", "Kosovar", "Kosovare", "Kosovar"],
  ["KW", "Koweït", "Kuwait", "Koweïtien", "Koweïtienne", "Kuwaiti"],
  ["LA", "Laos", "Laos", "Laotien", "Laotienne", "Laotian"],
  ["LS", "Lesotho", "Lesotho", "Lésothien", "Lésothienne", "Mosotho"],
  ["LV", "Lettonie", "Latvia", "Letton", "Lettone", "Latvian"],
  ["LB", "Liban", "Lebanon", "Libanais", "Libanaise", "Lebanese"],
  ["LR", "Liberia", "Liberia", "Libérien", "Libérienne", "Liberian"],
  ["LY", "Libye", "Libya", "Libyen", "Libyenne", "Libyan"],
  ["LI", "Liechtenstein", "Liechtenstein", "Liechtensteinois", "Liechtensteinoise", "Liechtensteiner"],
  ["LT", "Lituanie", "Lithuania", "Lituanien", "Lituanienne", "Lithuanian"],
  ["LU", "Luxembourg", "Luxembourg", "Luxembourgeois", "Luxembourgeoise", "Luxembourger"],
  ["MO", "Macao", "Macau", "Macanais", "Macanaise", "Macanese"],
  ["MK", "Macédoine du Nord", "North Macedonia", "Macédonien", "Macédonienne", "Macedonian"],
  ["MG", "Madagascar", "Madagascar", "Malgache", "Malgache", "Malagasy"],
  ["MY", "Malaisie", "Malaysia", "Malaisien", "Malaisienne", "Malaysian"],
  ["MW", "Malawi", "Malawi", "Malawien", "Malawienne", "Malawian"],
  ["MV", "Maldives", "Maldives", "Maldivien", "Maldivienne", "Maldivan"],
  ["ML", "Mali", "Mali", "Malien", "Malienne", "Malian"],
  ["MT", "Malte", "Malta", "Maltais", "Maltaise", "Maltese"],
  ["MA", "Maroc", "Morocco", "Marocain", "Marocaine", "Moroccan"],
  ["MQ", "Martinique", "Martinique", "Martiniquais", "Martiniquaise", "Martinican"],
  ["MR", "Mauritanie", "Mauritania", "Mauritanien", "Mauritanienne", "Mauritanian"],
  ["YT", "Mayotte", "Mayotte", "Mahorais", "Mahoraise", "Mahoran"],
  ["MX", "Mexique", "Mexico", "Mexicain", "Mexicaine", "Mexican"],
  ["FM", "Micronésie", "Micronesia", "Micronésien", "Micronésienne", "Micronesian"],
  ["MD", "Moldavie", "Moldova", "Moldave", "Moldave", "Moldovan"],
  ["MC", "Monaco", "Monaco", "Monégasque", "Monégasque", "Monegasque"],
  ["MN", "Mongolie", "Mongolia", "Mongol", "Mongole", "Mongolian"],
  ["ME", "Monténégro", "Montenegro", "Monténégrin", "Monténégrine", "Montenegrin"],
  ["MS", "Montserrat", "Montserrat", "Montserratien", "Montserratienne", "Montserratian"],
  ["MZ", "Mozambique", "Mozambique", "Mozambicain", "Mozambicaine", "Mozambican"],
  ["NA", "Namibie", "Namibia", "Namibien", "Namibienne", "Namibian"],
  ["NR", "Nauru", "Nauru", "Nauruan", "Nauruane", "Nauruan"],
  ["NP", "Népal", "Nepal", "Népalais", "Népalaise", "Nepalese"],
  ["NI", "Nicaragua", "Nicaragua", "Nicaraguayen", "Nicaraguayenne", "Nicaraguan"],
  ["NE", "Niger", "Niger", "Nigérien", "Nigérienne", "Nigerien"],
  ["NG", "Nigéria", "Nigeria", "Nigérian", "Nigériane", "Nigerian"],
  ["NU", "Niue", "Niue", "Niuéen", "Niuéenne", "Niuean"],
  ["NO", "Norvège", "Norway", "Norvégien", "Norvégienne", "Norwegian"],
  ["NC", "Nouvelle-Calédonie", "New Caledonia", "Néo-Calédonien", "Néo-Calédonienne", "New Caledonian"],
  ["NZ", "Nouvelle-Zélande", "New Zealand", "Neo-Zélandais", "Neo-Zélandaise", "New Zealander"],
  ["OM", "Oman", "Oman", "Omanais", "Omanaise", "Omani"],
  ["UG", "Ouganda", "Uganda", "Ougandais", "Ougandaise", "Ugandan"],
  ["UZ", "Ouzbékistan", "Uzbekistan", "Ouzbèke", "Ouzbèke", "Uzbekistani"],
  ["PK", "Pakistan", "Pakistan", "Pakistanais", "Pakistanaise", "Pakistani"],
  ["PW", "Palaos (Palau)", "Palau", "Paluan", "Paluane", "Palauan"],
  ["PS", "Palestine", "Palestine", "Palestinien", "Palestinienne", "Palestinian"],
  ["PA", "Panama", "Panama", "Panaméen", "Panaméenne", "Panamanian"],
  ["PG", "Papouasie-Nouvelle-Guinée", "Papua New Guinea", "Papouasien", "Papouasienne", "Papua New Guinean"],
  ["PY", "Paraguay", "Paraguay", "Paraguayen", "Paraguayenne", "Paraguayan"],
  ["NL", "Pays-Bas", "Netherlands", "Néerlandais", "Néerlandaise", "Dutch"],
  ["BQ", "Pays-Bas caribéens", "Caribbean Netherlands", "Néerlandais", "Néerlandaise", "Dutch"],
  ["PE", "Pérou", "Peru", "Péruvien", "Péruvienne", "Peruvian"],
  ["PH", "Philippines", "Philippines", "Philippin", "Philippine", "Filipino"],
  ["PL", "Pologne", "Poland", "Polonais", "Polonaise", "Polish"],
  ["PF", "Polynésie française", "French Polynesia", "Polynésien", "Polynésienne", "French Polynesian"],
  ["PR", "Porto Rico", "Puerto Rico", "Portoricain", "Portoricaine", "Puerto Rican"],
  ["PT", "Portugal", "Portugal", "Portugais", "Portugaise", "Portuguese"],
  ["QA", "Qatar", "Qatar", "Qatarien", "Qatarienne", "Qatari"],
  ["CF", "République centrafricaine", "Central African Republic", "Centrafricain", "Centrafricaine", "Central African"],
  ["DO", "République dominicaine", "Dominican Republic", "Dominicain", "Dominicaine", "Dominican"],
  ["RE", "Réunion", "Réunion", "Réunionnais", "Réunionnaise", "Réunionese"],
  ["RO", "Roumanie", "Romania", "Roumain", "Roumaine", "Romanian"],
  ["GB", "Royaume-Uni", "United Kingdom", "Britannique", "Britannique", "British"],
  ["RU", "Russie", "Russia", "Russe", "Russe", "Russian"],
  ["RW", "Rwanda", "Rwanda", "Rwandais", "Rwandaise", "Rwandan"],
  ["EH", "Sahara Occidental", "Western Sahara", "", "", "Sahrawi"],
  ["BL", "Saint-Barthélemy", "Saint Barthélemy", "Barthéloméen", "Barthéloméenne", "Saint Barthélemy Islander"],
  ["KN", "Saint-Christophe-et-Niévès", "Saint Kitts and Nevis", "Kittitien-et-nevicien", "Kittitienne-et-nevicienne", "Kittitian or Nevisian"],
  ["SM", "Saint-Marin", "San Marino", "Saint-Marinais", "Saint-Marinaise", "Sammarinese"],
  ["MF", "Saint-Martin", "Saint Martin", "Saint-Martinois", "Saint-Martinoise", "Saint Martin Islander"],
  ["SX", "Saint-Martin", "Sint Maarten", "Saint-Martinois", "Saint-Martinoise", "St. Maartener"],
  ["PM", "Saint-Pierre-et-Miquelon", "Saint Pierre and Miquelon", "Saint-Pierrais, Miquelonais", "Saint-Pierraise, Miquelonaise", "Saint-Pierrais, Miquelonnais"],
  ["VC", "Saint-Vincent-et-les-Grenadines", "Saint Vincent and the Grenadines", "Vincentais", "Vincentaise", "Saint Vincentian"],
  ["SH", "Sainte-Hélène, Ascension et Tristan da Cunha", "Saint Helena, Ascension and Tristan da Cunha", "Sainte-Hélènois", "Sainte-Hélénoise", "Saint Helenian"],
  ["LC", "Sainte-Lucie", "Saint Lucia", "Saint-Lucien", "Saint-Lucienne", "Saint Lucian"],
  ["SV", "Salvador", "El Salvador", "Salvadorien", "Salvadorienne", "Salvadoran"],
  ["WS", "Samoa", "Samoa", "Samoan", "Samoane", "Samoan"],
  ["AS", "Samoa américaines", "American Samoa", "Samoan", "Samoane", "American Samoan"],
  ["ST", "São Tomé et Príncipe", "São Tomé and Príncipe", "Santoméen", "Santoméenne", "Sao Tomean"],
  ["SN", "Sénégal", "Senegal", "Sénégalais", "Sénégalaise", "Senegalese"],
  ["RS", "Serbie", "Serbia", "Serbe", "Serbe", "Serbian"],
  ["SC", "Seychelles", "Seychelles", "Seychellois", "Seychelloise", "Seychellois"],
  ["SL", "Sierra Leone", "Sierra Leone", "Sierra-leonais", "Sierra-leonaise", "Sierra Leonean"],
  ["SG", "Singapour", "Singapore", "Singapourien", "Singapourienne", "Singaporean"],
  ["SK", "Slovaquie", "Slovakia", "Slovaque", "Slovaque", "Slovak"],
  ["SI", "Slovénie", "Slovenia", "Slovène", "Slovène", "Slovene"],
  ["SO", "Somalie", "Somalia", "Somalien", "Somalienne", "Somali"],
  ["SD", "Soudan", "Sudan", "Soudanais", "Soudanaise", "Sudanese"],
  ["SS", "Soudan du Sud", "South Sudan", "Sud-Soudanais", "Sud-Soudanaise", "South Sudanese"],
  ["LK", "Sri Lanka", "Sri Lanka", "Sri-lankais", "Sri-lankaise", "Sri Lankan"],
  ["SE", "Suède", "Sweden", "Suédois", "Suédoise", "Swedish"],
  ["CH", "Suisse", "Switzerland", "Suisse", "Suisse", "Swiss"],
  ["SR", "Surinam", "Suriname", "Surinamais", "Surinamaise", "Surinamer"],
  ["SJ", "Svalbard et Jan Mayen", "Svalbard and Jan Mayen", "", "", "Norwegian"],
  ["SZ", "Swaziland", "Eswatini", "Swazie", "Swazie", "Swazi"],
  ["SY", "Syrie", "Syria", "Syrien", "Syrienne", "Syrian"],
  ["TJ", "Tadjikistan", "Tajikistan", "Tadjike", "Tadjike", "Tadzhik"],
  ["TW", "Taïwan", "Taiwan", "Taïwanais", "Taïwanaise", "Taiwanese"],
  ["TZ", "Tanzanie", "Tanzania", "Tanzanien", "Tanzanienne", "Tanzanian"],
  ["TD", "Tchad", "Chad", "Tchadien", "Tchadienne", "Chadian"],
  ["CZ", "Tchéquie", "Czechia", "Tchèque", "Tchèque", "Czech"],
  ["TF", "Terres australes et antarctiques françaises", "French Southern and Antarctic Lands", "Français", "Française", "French"],
  ["IO", "Territoire britannique de l'océan Indien", "British Indian Ocean Territory", "", "", "Indian"],
  ["TH", "Thaïlande", "Thailand", "Thaïlandais", "Thaïlandaise", "Thai"],
  ["TL", "Timor oriental", "Timor-Leste", "Est-timorais", "Est-timoraise", "East Timorese"],
  ["TG", "Togo", "Togo", "Togolais", "Togolaise", "Togolese"],
  ["TK", "Tokelau", "Tokelau", "", "", "Tokelauan"],
  ["TO", "Tonga", "Tonga", "Tonguien", "Tonguienne", "Tongan"],
  ["TT", "Trinité-et-Tobago", "Trinidad and Tobago", "Trinidadien", "Trinidadienne", "Trinidadian"],
  ["TN", "Tunisie", "Tunisia", "Tunisien", "Tunisienne", "Tunisian"],
  ["TM", "Turkménistan", "Turkmenistan", "Turkmène", "Turkmène", "Turkmen"],
  ["TR", "Turquie", "Türkiye", "Turc", "Turque", "Turkish"],
  ["TV", "Tuvalu", "Tuvalu", "Tuvaluan", "Tuvaluane", "Tuvaluan"],
  ["UA", "Ukraine", "Ukraine", "Ukrainien", "Ukrainienne", "Ukrainian"],
  ["UY", "Uruguay", "Uruguay", "Uruguayen", "Uruguayenne", "Uruguayan"],
  ["VU", "Vanuatu", "Vanuatu", "Vanuatuan", "Vanuatuane", "Ni-Vanuatu"],
  ["VE", "Venezuela", "Venezuela", "Vénézuélien", "Vénézuélienne", "Venezuelan"],
  ["VN", "Viêt Nam", "Vietnam", "Vietnamien", "Vietnamienne", "Vietnamese"],
  ["WF", "Wallis-et-Futuna", "Wallis and Futuna", "", "", "Wallis and Futuna Islander"],
  ["YE", "Yémen", "Yemen", "Yéménite", "Yéménite", "Yemeni"],
  ["ZM", "Zambie", "Zambia", "Zambien", "Zambienne", "Zambian"],
  ["ZW", "Zimbabwe", "Zimbabwe", "Zimbabwéen", "Zimbabwéenne", "Zimbabwean"],
];

export const COUNTRIES: readonly Country[] = ROWS.map(
  ([code, fr, en, demonymFrM, demonymFrF, demonymEn]) => ({
    code,
    fr,
    en,
    demonymFrM,
    demonymFrF,
    demonymEn,
  })
);

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

/** The country for a code, or null — an unknown code is never guessed at. */
export function country(code: string | null | undefined): Country | null {
  if (!code) return null;
  return BY_CODE.get(code.toUpperCase()) ?? null;
}

/** The country's name in one language, or null. */
export function countryName(
  code: string | null | undefined,
  lang: "fr" | "en"
): string | null {
  const c = country(code);
  return c ? c[lang] : null;
}

/**
 * "France / France" — the bilingual form the documents set, English first.
 *
 * Both halves print even when identical, because dropping the repeat would
 * make one line read differently from the hundred around it.
 */
export function countryLabel(code: string | null | undefined): string | null {
  const c = country(code);
  return c ? `${c.en} / ${c.fr}` : null;
}

/**
 * "French / Française" — a nationality, English first.
 *
 * The French half takes the feminine, which is the form that agrees with
 * "nationalité" — see the note at the top of this file. Falls back to the
 * country's name for the sixteen territories that carry no demonym.
 */
export function nationalityLabel(code: string | null | undefined): string | null {
  const c = country(code);
  if (!c) return null;
  const en = c.demonymEn || c.en;
  const fr = c.demonymFrF || c.fr;
  return `${en} / ${fr}`;
}

/**
 * "Vladikavkaz, Russia / Russie" — a birthplace for a document.
 *
 * The city is whatever the client typed and is never translated. The country
 * takes the bilingual form only when the two names differ, so "Cannes, France"
 * stays one word rather than repeating itself — the repetition is worth it on
 * a column of labels, where the eye expects the slash, and noise on a value
 * that happens to be the same in both languages.
 *
 * Either half may be missing: a city alone prints alone, a country alone
 * prints alone, and neither gives null rather than a stray comma.
 */
export function birthPlaceLabel(
  city: string | null | undefined,
  code: string | null | undefined
): string | null {
  const c = country(code);
  const place = c ? (c.en === c.fr ? c.fr : `${c.en} / ${c.fr}`) : null;
  const parts = [city?.trim() || null, place].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

/**
 * "French, Swiss / Française, Suisse" — one or more nationalities.
 *
 * Grouped by language rather than by nationality: "French / Française, Swiss /
 * Suisse" makes the reader work out which slash belongs to which pair, while
 * one English list and one French list read as the same sentence twice, which
 * is what every other bilingual line on these documents does.
 */
export function nationalitiesLabel(
  codes: readonly string[] | null | undefined
): string | null {
  const found = (codes ?? []).map(country).filter((c): c is Country => c !== null);
  if (found.length === 0) return null;
  const en = found.map((c) => c.demonymEn || c.en).join(", ");
  const fr = found.map((c) => c.demonymFrF || c.fr).join(", ");
  return `${en} / ${fr}`;
}
