import 'dotenv/config'
import { prisma } from './client'

// Three personas, each modelled on a documented failure from real forum reports.
// Every value is synthetic: these UANs, names, member IDs, claim IDs and amounts
// belong to nobody. Nothing here was copied from a real member's record.

const SIMULATED_TODAY = '2026-08-26'

async function main() {
  // Order matters: children first, since claims and accounts point at members.
  await prisma.grievance.deleteMany()
  await prisma.claim.deleteMany()
  await prisma.account.deleteMany()
  await prisma.member.deleteMany()

  // 1. Disbursal hold. Passbook debited, bank empty, status moved backwards.
  //    The EPFO 3.0 migration case that filled r/EPFO through July 2026.
  await prisma.member.create({
    data: {
      uan: '100000000001',
      demoLabel: 'Money left my PF but never reached my bank',
      nameOnEpfo: 'RAJESH KUMAR',
      nameOnAadhaar: 'RAJESH KUMAR',
      nameOnBank: 'RAJESH KUMAR',
      dobOnEpfo: '1994-02-11',
      dobOnAadhaar: '1994-02-11',
      bankNpciVerified: true,
      chequeUploadLegible: true,
      epsFlaggedButIneligible: false,
      otherUans: [],
      accounts: {
        create: [
          {
            memberId: 'MH/BAN/0012345/000/0001234',
            employer: 'Acme Softworks Pvt Ltd',
            joinedOn: '2021-04-01',
            exitedOn: null,
            dateOfExitMarked: true,
            epfBalancePaise: 62_000_000,
            epsBalancePaise: 0,
            transferredOut: false,
          },
        ],
      },
      claims: {
        create: [
          {
            id: 'CLM-2026-070301',
            memberId: 'MH/BAN/0012345/000/0001234',
            type: 'FORM31',
            filedAt: '2026-07-03',
            amountPaise: 12_000_000,
            simulatedToday: SIMULATED_TODAY,
            portalHistory: [
              { observedAt: '2026-07-03', status: 'SUBMITTED_AT_PORTAL' },
              { observedAt: '2026-07-11', status: 'UNDER_PROCESS' },
              { observedAt: '2026-07-15', status: 'SETTLED' },
              { observedAt: '2026-07-28', status: 'SUBMITTED_AT_PORTAL' },
            ],
            passbook: { observedAt: '2026-07-19', settledShown: true, debitedPaise: 12_000_000 },
            bank: { observedAt: SIMULATED_TODAY, creditedPaise: null },
            grievances: {
              create: [
                {
                  channel: 'EPFIGMS',
                  filedAt: '2026-07-25',
                  docket: 'EPFOG/E/2026/0071234',
                  closedAt: '2026-07-25',
                  resolved: false,
                  closureText:
                    'Claim is under process at SBI end. Please wait for a few days.',
                },
              ],
            },
          },
        ],
      },
    },
  })

  // 2. Auto-rejection on a one-letter name mismatch, with no reason given.
  await prisma.member.create({
    data: {
      uan: '100000000002',
      demoLabel: 'My claim keeps getting rejected and I do not know why',
      nameOnEpfo: 'SUNITA DEVI',
      nameOnAadhaar: 'SUNEETA DEVI',
      nameOnBank: 'SUNITA DEVI',
      dobOnEpfo: '1988-09-04',
      dobOnAadhaar: '1988-09-04',
      bankNpciVerified: false,
      chequeUploadLegible: false,
      epsFlaggedButIneligible: false,
      otherUans: [],
      accounts: {
        create: [
          {
            memberId: 'DL/CPM/0045678/000/0004567',
            employer: 'Nova Retail India',
            joinedOn: '2019-06-10',
            exitedOn: '2026-04-30',
            dateOfExitMarked: true,
            epfBalancePaise: 21_500_000,
            epsBalancePaise: 0,
            transferredOut: false,
          },
        ],
      },
      claims: {
        create: [
          {
            id: 'CLM-2026-061502',
            memberId: 'DL/CPM/0045678/000/0004567',
            type: 'FORM19',
            filedAt: '2026-06-15',
            amountPaise: 21_500_000,
            simulatedToday: SIMULATED_TODAY,
            rejectionCode: 'REJ-NAME-MISMATCH-01',
            portalHistory: [
              { observedAt: '2026-06-15', status: 'SUBMITTED_AT_PORTAL' },
              { observedAt: '2026-07-11', status: 'REJECTED' },
            ],
            // passbook and bank omitted: no record exists yet, so both stay NULL.
          },
        ],
      },
    },
  })

  // 3. Wrongly flagged as a pension scheme member, so the transfer fails and
  //    ₹2.8L sits stranded in an old account he cannot see.
  await prisma.member.create({
    data: {
      uan: '100000000003',
      demoLabel: 'I changed jobs and my old PF never followed me',
      nameOnEpfo: 'IMRAN SHAIKH',
      nameOnAadhaar: 'IMRAN SHAIKH',
      nameOnBank: 'IMRAN SHAIKH',
      dobOnEpfo: '1992-11-23',
      dobOnAadhaar: '1992-11-23',
      bankNpciVerified: true,
      chequeUploadLegible: true,
      epsFlaggedButIneligible: true,
      otherUans: [],
      accounts: {
        create: [
          {
            memberId: 'KA/BNG/0099887/000/0009988',
            employer: 'Present Labs',
            joinedOn: '2026-06-01',
            exitedOn: null,
            dateOfExitMarked: false,
            epfBalancePaise: 8_000_000,
            epsBalancePaise: 0,
            transferredOut: false,
          },
          {
            memberId: 'MH/PUN/0033221/000/0003322',
            employer: 'Former Technologies',
            joinedOn: '2021-01-04',
            exitedOn: '2026-05-15',
            dateOfExitMarked: true,
            epfBalancePaise: 27_500_000,
            epsBalancePaise: 500_000,
            transferredOut: false,
          },
        ],
      },
      claims: {
        create: [
          {
            id: 'CLM-2026-060103',
            memberId: 'MH/PUN/0033221/000/0003322',
            type: 'FORM13',
            filedAt: '2026-06-01',
            amountPaise: 28_000_000,
            simulatedToday: SIMULATED_TODAY,
            portalHistory: [
              { observedAt: '2026-06-01', status: 'SUBMITTED_AT_PORTAL' },
              { observedAt: '2026-06-20', status: 'UNDER_PROCESS' },
            ],
            // passbook and bank omitted: no record exists yet, so both stay NULL.
            grievances: {
              create: [
                {
                  channel: 'EPFIGMS',
                  filedAt: '2026-06-25',
                  docket: 'EPFOG/E/2026/0065432',
                  closedAt: '2026-06-26',
                  resolved: false,
                  closureText: 'Please contact your employer.',
                },
                {
                  channel: 'CPGRAMS',
                  filedAt: '2026-06-28',
                  docket: 'MOLBR/E/2026/0012345',
                  closedAt: '2026-07-14',
                  resolved: false,
                  closureText:
                    'Grievance disposed. Member advised to approach concerned regional office.',
                },
              ],
            },
          },
        ],
      },
    },
  })

  const [members, claims, grievances] = await Promise.all([
    prisma.member.count(),
    prisma.claim.count(),
    prisma.grievance.count(),
  ])
  console.log(`Seeded ${members} members, ${claims} claims, ${grievances} grievances.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
