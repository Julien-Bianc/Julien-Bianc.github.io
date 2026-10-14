// ============================================================
//  PALETTES SHINY (chromatiques) — couleur normale → couleur shiny, pour chaque Pokémon.
//  Calculées automatiquement en comparant les sprites normaux du jeu aux sprites shiny officiels de
//  PMDCollab / SpriteCollab (dossier sprite/<numéro>/0000/0001). Le jeu recolore les images à la volée :
//  aucun sprite supplémentaire à télécharger.
//  Nouveau Pokémon : sans palette ici, il ne peut pas devenir shiny (le Shiny Swapper ne le proposera pas).
// ============================================================
const SHINY_PAL = {
  bulbizarre:{ '278700':'3d703a', '5fb727':'488b48', '9fcf6f':'7fa95c', 'd7efa7':'b7d69d', 'ff875f':'ff7072' },
  herbizarre:{ 'd73f00':'ffd700', '9f0000':'cf8f00', 'dfb700':'b76f2f', 'fff700':'971f37', '278700':'27873f', 'ff875f':'fff797', '5fb727':'5faf27', '577787':'278700', '6f9fc7':'5fb727', 'd7efa7':'afff3f', '9fcf6f':'7fdf57', 'afcfef':'9fdf47' },
  florizarre:{ '9f0000':'cf8f00', 'd73f00':'ffd700', 'dfb700':'cfd727', 'a76f00':'b76f2f', 'ff875f':'fff797', '278700':'27873f', '5fb727':'5faf27', '3f576f':'278700', '67879f':'5fb727', '87afcf':'9fdf47', 'd7efa7':'afff3f', '9fcf6f':'7fdf57' },
  salameche:{ 'd73f00':'e99d47', 'ff875f':'f5cf82', '9f0000':'cd6f05', 'dfb700':'ebeaa8', 'a76f00':'c3c25a' },
  reptincel:{ 'd73f00':'f7cf7b', '9f0000':'cb832e', 'ffe79f':'f5f9cd', 'dfaf67':'f5f9cd', 'bf7727':'ecd478' },
  dracaufeu:{ 'ff875f':'7f7787', 'd73f00':'5f5f67', '9f0000':'47474f', '373f8f':'971f37', 'bfcff7':'c7c7c7', 'dfb700':'d1bc9a', 'a76f00':'9b946c' },
  carapuce:{ '0067b7':'28718b', '1f9fe7':'69a7bd', '7fcfff':'b5dae7', '9f0000':'346d34', 'ffffff':'fafbfb', 'bf7727':'66a966', 'dfaf67':'b3d5b3', 'ffe79f':'feffbc', 'd7dfdf':'fafbfb', '7f8f97':'69a7bd' },
  carabaffe:{ '879fff':'b6a6f8', 'b7cfff':'d6ecdf', '5767b7':'7b69b5', '773f00':'294e1f', 'ffe79f':'ecab6d', 'af671f':'95510d', 'dfaf67':'c07a50', 'df771f':'598346', 'ff9747':'87ad70', '373f8f':'7b69b5' },
  tortank:{ '773f00':'2f6717', 'af671f':'5f973f', '4f5f97':'9f7fb7', '373f8f':'6f4f8f', '6787af':'cfa7f7', 'b7bfc7':'c7c7cf', 'dfaf67':'df9f27', 'ffe79f':'ffcf77' },
  raichu:{ 'a75f1f':'a7774f', '773f00':'874f17', 'dfb700':'b79767', 'fff700':'dfbf8f', 'df871f':'df6f1f', 'ffaf47':'ff9747', 'ffc7d7':'ff8faf', 'e73f67':'ff8faf' },
  rondoudou:{ 'ffc7d7':'f3d3ec', 'ff8faf':'e6a8da', 'e73f67':'c26bbb', '9f0000':'7a0e68', '2f6f67':'256b3f', '37a777':'3ca737', 'd73f00':'9a3d8a' },
  alakazam:{ 'fff700':'fdd949', 'dfb700':'c79325', 'df771f':'d862a0', 'a75f1f':'b2376d', 'a76f00':'9a5009' },
  ectoplasma:{ 'b797df':'9090a8', '8f67bf':'686880', '572f9f':'384060' },
  mewtwo:{ 'af6fb7':'90c840', 'd797df':'b8e858', '873f87':'589020' },
  fouinar:{ 'b78727':'efa7ad', 'fff79f':'ffeede', 'd7bf67':'fcc9d0', 'a75f1f':'db518a', '773f00':'bf4180', 'dfb700':'ed7da6', 'fff700':'f9acc8' },
  cizayox:{ 'bfcff7':'ddffdf', '6787af':'7aad74', 'd73f00':'bbce01', 'ff875f':'ebf470', '9f0000':'718915', '4f5f97':'377b52', '575757':'427e3a', '2f2f2f':'123615' },
  tyranocif:{ 'cfe797':'e7d694', 'e7f7cf':'f7efbd', 'a7b777':'b5a573', '778757':'7a6e44', '879fff':'bc79ce', 'b7cfff':'e7adff', '5767b7':'865193' },
  gardevoir:{ '5fc737':'7ea4ca', '8fff67':'b6def6', '278700':'47627a', 'afb7bf':'b5afbb', '7f8f97':'8b878f', 'e73f67':'ba6c31', 'ff8faf':'ff9b4f', 'd7dfdf':'dedee8' },
  carchacrok:{ '4f6fb7':'425466', '6f9fe7':'6a8699', '37478f':'252e3d', 'cf473f':'bd4a00', 'ff6f57':'ff8c39', '9f172f':'841000' },
  lucario:{ '0067b7':'a99e3e', '1fa7e7':'d5dd63', '7f8f97':'5b8091', '47676f':'39565d', '7fcfff':'f1f984', 'ffd787':'70b4c4', 'c78f4f':'3e728a', 'fff7af':'98d1de', 'afb7bf':'6290a5', 'ff87df':'e38ba1' },
  farfuret:{ 'd73f00':'c9a203', 'ff875f':'ffde5f', '4f5f97':'fb9ec8', '373f8f':'de4f8f', '9f0000':'9f5700', 'dfb700':'75b2ea', 'fff700':'82e6ff', 'a76f00':'5579c2' }
};
