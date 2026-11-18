# Procedures

Step-by-step procedures and the company's maintenance procedure cards (MPCs), one file each, filed in
folders:

```
procedures/
  general/              equipment every boat has (e.g. reduction gear maintenance), on every boat
  cat/                  on every CAT main engine boat
    3606/ 3612/           engine_model "CAT 3612" -> cat/3612/
  emd/                  on every EMD boat
    645/                  on every 645 (mechanical)
      12cyl/ 16cyl/ 20cyl/
    710/                  on every 710 (electronic injection)
      12cyl/ 16cyl/ 20cyl/  engine_model "EMD 710 16cyl" -> emd/710/16cyl/
  gearboxes/            on every boat with a gear
    falk/ lufkin/ reintjes/   by the boats' gear_make
  generators/           on every boat with a generator
    cat-3306/ cummins/ john-deere-6081/ john-deere-6090/   by the boats' generator_model
```

A card's fields at the top (MPC code, frequency, revision date, what it applies to) show as its header.
`card: Technical Reference Card` and `code_label: TRC code` for a reference card. A line ending in `\` keeps
its line break.
Pictures for a procedure go in an `images/` folder next to it.
