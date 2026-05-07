import { PrismaClient, Feature } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

// Postes du bureau issus du PV AG constitutive
const POSTS = [
  "Président",
  "Vice-Président",
  "Secrétaire Général",
  "Secrétaire Général Adjoint",
  "Trésorier Général",
  "Trésorier Général Adjoint",
  "Commissaire aux Comptes",
  "Commissaire aux Comptes Adjoint",
];

// Permissions par défaut du Président (toutes)
const PRESIDENT_FEATURES: Feature[] = Object.values(Feature);

// Permissions par défaut du Trésorier Général
const TRESORIER_FEATURES: Feature[] = [
  Feature.MEMBERS_VIEW,
  Feature.COTISATIONS_VIEW,
  Feature.COTISATIONS_MANAGE,
  Feature.COTISATIONS_CONFIRM,
  Feature.TREASURY_VIEW,
  Feature.TREASURY_MANAGE,
  Feature.TREASURY_EXPORT,
];

// Permissions par défaut du Commissaire aux Comptes
const CAC_FEATURES: Feature[] = [
  Feature.MEMBERS_VIEW,
  Feature.COTISATIONS_VIEW,
  Feature.TREASURY_VIEW,
  Feature.TREASURY_EXPORT,
];

// Permissions par défaut du Secrétaire Général
const SECRETAIRE_FEATURES: Feature[] = [
  Feature.MEMBERS_VIEW,
  Feature.MEMBERS_VIEW_DETAIL,
  Feature.MEMBERS_EXPORT,
  Feature.MEETINGS_VIEW,
  Feature.MEETINGS_CREATE,
  Feature.MEETINGS_ATTENDANCE,
  Feature.MEETINGS_UPLOAD_PV,
  Feature.ANNOUNCEMENTS_CREATE,
];

const DEFAULT_PERMISSIONS: Record<string, Feature[]> = {
  "Président": PRESIDENT_FEATURES,
  "Vice-Président": PRESIDENT_FEATURES,
  "Secrétaire Général": SECRETAIRE_FEATURES,
  "Secrétaire Général Adjoint": SECRETAIRE_FEATURES,
  "Trésorier Général": TRESORIER_FEATURES,
  "Trésorier Général Adjoint": TRESORIER_FEATURES,
  "Commissaire aux Comptes": CAC_FEATURES,
  "Commissaire aux Comptes Adjoint": CAC_FEATURES,
};

async function main() {
  console.log("🌱 Seeding database...");

  // 1. Catégories de membres (types de contrat)
  const categories = await Promise.all([
    prisma.memberCategory.upsert({
      where: { name: "CDI" },
      update: {},
      create: { name: "CDI", monthlyFee: 3000 },
    }),
    prisma.memberCategory.upsert({
      where: { name: "CDD" },
      update: {},
      create: { name: "CDD", monthlyFee: 2000 },
    }),
    prisma.memberCategory.upsert({
      where: { name: "Vacation" },
      update: {},
      create: { name: "Vacation", monthlyFee: 1000 },
    }),
  ]);
  console.log(`✓ ${categories.length} catégories de membres`);

  // 2. Postes du bureau
  const posts = await Promise.all(
    POSTS.map((name) =>
      prisma.post.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    )
  );
  console.log(`✓ ${posts.length} postes du bureau`);

  // 3. Permissions par défaut par poste
  let permCount = 0;
  for (const post of posts) {
    const features = DEFAULT_PERMISSIONS[post.name] ?? [];
    for (const feature of features) {
      await prisma.permission.upsert({
        where: { postId_feature: { postId: post.id, feature } },
        update: {},
        create: { postId: post.id, feature, granted: true },
      });
      permCount++;
    }
  }
  console.log(`✓ ${permCount} permissions par défaut`);

  // 4. Configuration globale (singleton)
  await prisma.appConfig.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      orgName: "Amicale des PATs — ENSMG",
      defaultLocale: "fr",
    },
  });
  console.log("✓ Configuration globale");

  // 5. Admin système initial (mot de passe temporaire — à changer impérativement)
  const tempPassword = "ChangeMe123!";
  const passwordHash = crypto
    .createHash("sha256")
    .update(tempPassword)
    .digest("hex");

  await prisma.user.upsert({
    where: { email: "admin@apats.ensmg" },
    update: {},
    create: {
      email: "admin@apats.ensmg",
      name: "Admin Système",
      passwordHash,
      role: "ADMIN",
      locale: "fr",
    },
  });
  console.log("✓ Compte admin initial (admin@apats.ensmg / ChangeMe123!)");
  console.log("⚠️  Changer le mot de passe admin immédiatement après le premier login !");

  // 6. Membres de l'amicale (liste AG constitutive)
  const memberPasswordHash = crypto
    .createHash("sha256")
    .update("ENSMG2026")
    .digest("hex");

  const cdi      = categories.find((c) => c.name === "CDI")!;
  const cdd      = categories.find((c) => c.name === "CDD")!;
  const vacation = categories.find((c) => c.name === "Vacation")!;

  // Règle email : prénoms collés sans séparateur (tout minuscules) + "." + nom minuscule
  const MEMBERS = [
    { name: "Josephine MALO",            email: "josephine.malo@ensmg.com",           categoryId: cdi.id,      oldEmail: "josephine.malo@ensmg.com"            },
    { name: "Mariama LY",                email: "mariama.ly@ensmg.com",               categoryId: cdi.id,      oldEmail: "mariama.ly@ensmg.com"                },
    { name: "Abdoulaye LY",              email: "abdoulaye.ly@ensmg.com",             categoryId: cdi.id,      oldEmail: "abdoulaye.ly@ensmg.com"              },
    { name: "Cheikh Tidiane DIÉMÉ",      email: "cheikhtidiane.dieme@ensmg.com",      categoryId: cdi.id,      oldEmail: "cheikh.tidiane.dieme@ensmg.com"      },
    { name: "Abdou DIOUF",               email: "abdou.diouf@ensmg.com",              categoryId: cdi.id,      oldEmail: "abdou.diouf@ensmg.com"               },
    { name: "Fatema NDIAYE",             email: "fatema.ndiaye@ensmg.com",            categoryId: cdi.id,      oldEmail: "fatema.ndiaye@ensmg.com"             },
    { name: "Ngoné FALL",                email: "ngone.fall@ensmg.com",               categoryId: cdi.id,      oldEmail: "ngone.fall@ensmg.com"                },
    { name: "Papa Ibrahima SY",          email: "papaibrahima.sy@ensmg.com",          categoryId: vacation.id, oldEmail: "papa.ibrahima.sy@ensmg.com"          },
    { name: "Sekou Mamadou BOYE",        email: "sekoumamadou.boye@ensmg.com",        categoryId: vacation.id, oldEmail: "sekou.mamadou.boye@ensmg.com"        },
    { name: "El Hadji Abdou Babou NGOM", email: "elhadjiabdoubabou.ngom@ensmg.com",  categoryId: cdd.id,      oldEmail: "el.hadji.abdou.babou.ngom@ensmg.com" },
    { name: "Papa Ndiaye TOP",           email: "papandiaye.top@ensmg.com",           categoryId: vacation.id, oldEmail: "papa.ndiaye.top@ensmg.com"           },
    { name: "Mouhamadou Moustapha DIOP", email: "mouhamadoumoustapha.diop@ensmg.com", categoryId: cdi.id,      oldEmail: "mouhamadou.moustapha.diop@ensmg.com" },
    { name: "Tidiane BA",                email: "tidiane.ba@ensmg.com",               categoryId: cdi.id,      oldEmail: "tidiane.ba@ensmg.com"                },
    { name: "Oumou FAYE",                email: "oumou.faye@ensmg.com",               categoryId: vacation.id, oldEmail: "oumou.faye@ensmg.com"                },
    { name: "Aliou B BOCOUM",            email: "alioub.bocoum@ensmg.com",            categoryId: cdi.id,      oldEmail: "aliou.b.bocoum@ensmg.com"            },
    { name: "Abdoulaye Ndiathieu NDIR",  email: "abdoulayendiathieu.ndir@ensmg.com",  categoryId: cdd.id,      oldEmail: "abdoulaye.ndiathieu.ndir@ensmg.com"  },
    { name: "Mamadou SAKHO",             email: "mamadou.sakho@ensmg.com",            categoryId: cdd.id,      oldEmail: "mamadou.sakho@ensmg.com"             },
    { name: "Moussa DIABHATÉ",           email: "moussa.diabate@ensmg.com",           categoryId: cdi.id,      oldEmail: "moussa.diabate@ensmg.com"            },
    { name: "Mariama SOW",               email: "mariama.sow@ensmg.com",              categoryId: vacation.id, oldEmail: "mariama.sow@ensmg.com"               },
    { name: "Daba Tening FAYE",          email: "dabatening.faye@ensmg.com",          categoryId: vacation.id, oldEmail: "daba.tening.faye@ensmg.com"          },
  ];

  let memberCount = 0;
  for (const m of MEMBERS) {
    // Migrer l'ancien email si le format a changé
    if (m.oldEmail !== m.email) {
      await prisma.user.updateMany({
        where: { email: m.oldEmail },
        data:  { email: m.email },
      });
    }
    await prisma.user.upsert({
      where:  { email: m.email },
      update: {},
      create: {
        email:        m.email,
        name:         m.name,
        passwordHash: memberPasswordHash,
        role:         "MEMBER",
        locale:       "fr",
        categoryId:   m.categoryId,
      },
    });
    memberCount++;
  }
  console.log(`✓ ${memberCount} membres créés/mis à jour (mot de passe : ENSMG2026)`);

  console.log("\n✅ Seed terminé.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
