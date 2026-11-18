# Procedures

Step-by-step procedures and the company's maintenance procedure cards (MPCs), one file each, filed in
folders:

```
procedures/
  general/              equipment every boat has (e.g. reduction gear maintenance), on every boat
  cat/                  main engines by make, then model, named like the boats' engine_model
    3606/ 3612/           ("CAT 3612" -> cat/3612/, "Cummins QSK60" -> cummins/qsk60/)
  cummins/              the Z drives (all Cummins): cards for their engines or Steerprop drives
    qsk60/                their main engines
  emd/                  on every EMD boat
    645/                  on every 645 (mechanical)
      12cyl/ 16cyl/ 20cyl/
    710/                  on every 710 (electronic injection)
      12cyl/ 16cyl/ 20cyl/  engine_model "EMD 710 16cyl" -> emd/710/16cyl/
  gearboxes/            a conventional boat's reduction gear, by the boats' gear_make
    falk/ haley/ lufkin/ reintjes/
  generators/           by make, then model, from the boats' generator_model
    cat/3306/  cummins/6cta8-3d/ qsm11/ qsx15/  john-deere/6081/ 6090/
```

A card's fields at the top (MPC code, frequency, revision date, what it applies to) show as its header.
`card: Technical Reference Card` and `code_label: TRC code` for a reference card. A line ending in `\` keeps
its line break.
Pictures for a procedure go in an `images/` folder next to it.
