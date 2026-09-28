/**
 * The rules the demo's Adminium plays, as `manifest.json` declares them.
 * Written by `npm run demo-rules`; do not edit by hand.
 */
// prettier-ignore
export const MANIFEST_RULES = {
  "stamps": {
    "room_closures": {
      "set_by": {
        "set": "user-name",
        "on": "create"
      },
      "created_at": {
        "set": "now",
        "on": "create"
      }
    },
    "customers": {
      "created_at": {
        "set": "now",
        "on": "create"
      }
    },
    "stays": {
      "cancel_by": {
        "set": {
          "moment": {
            "column": "arrive",
            "time": {
              "table": "settings",
              "column": "arrive_from"
            },
            "minus": {
              "days": {
                "table": "settings",
                "column": "cancel_days"
              }
            }
          }
        },
        "on": {
          "columns": [
            "arrive"
          ]
        }
      },
      "created_at": {
        "set": "now",
        "on": "create"
      },
      "checked_in_at": {
        "set": "now",
        "on": {
          "column": "status",
          "values": [
            "in_house"
          ]
        }
      },
      "checked_in_by": {
        "set": "user-name",
        "on": {
          "column": "status",
          "values": [
            "in_house"
          ]
        }
      },
      "checked_out_at": {
        "set": "now",
        "on": {
          "column": "status",
          "values": [
            "departed"
          ]
        }
      },
      "checked_out_by": {
        "set": "user-name",
        "on": {
          "column": "status",
          "values": [
            "departed"
          ]
        }
      },
      "cancelled_at": {
        "set": "now",
        "on": {
          "column": "status",
          "values": [
            "cancelled"
          ]
        }
      },
      "cancelled_by": {
        "set": {
          "byOrigin": {
            "public": "guest",
            "staff": "user-name"
          }
        },
        "on": {
          "column": "status",
          "values": [
            "cancelled"
          ]
        }
      },
      "no_show_marked_at": {
        "set": "now",
        "on": {
          "column": "status",
          "values": [
            "no_show"
          ]
        },
        "clearOnBack": true
      }
    },
    "stay_extras": {
      "added_at": {
        "set": "now",
        "on": "create"
      }
    },
    "charges": {
      "charged_on": {
        "set": "today",
        "on": "create"
      },
      "recorded_by": {
        "set": "user-name",
        "on": "create"
      },
      "voided_at": {
        "set": "now",
        "on": {
          "column": "voided",
          "values": [
            true
          ]
        }
      },
      "voided_by": {
        "set": "user-name",
        "on": {
          "column": "voided",
          "values": [
            true
          ]
        }
      }
    },
    "stay_credits": {
      "recorded_by": {
        "set": "user-name",
        "on": "create"
      },
      "created_at": {
        "set": "now",
        "on": "create"
      },
      "voided_at": {
        "set": "now",
        "on": {
          "column": "voided",
          "values": [
            true
          ]
        }
      },
      "voided_by": {
        "set": "user-name",
        "on": {
          "column": "voided",
          "values": [
            true
          ]
        }
      }
    },
    "payments": {
      "paid_on": {
        "set": "today",
        "on": "create"
      },
      "recorded_at": {
        "set": "now",
        "on": "create"
      },
      "recorded_by": {
        "set": "user-name",
        "on": "create"
      },
      "voided_at": {
        "set": "now",
        "on": {
          "column": "voided",
          "values": [
            true
          ]
        }
      },
      "voided_by": {
        "set": "user-name",
        "on": {
          "column": "voided",
          "values": [
            true
          ]
        }
      }
    },
    "messages": {
      "created_at": {
        "set": "now",
        "on": "create"
      }
    }
  },
  "enums": {
    "settings": {},
    "house_notes": {},
    "room_types": {},
    "room_type_features": {},
    "rooms": {
      "status": [
        "ready",
        "occupied",
        "cleaning"
      ]
    },
    "room_closures": {},
    "rate_rules": {},
    "extras": {
      "per": [
        "person_night",
        "night",
        "stay"
      ]
    },
    "charge_items": {},
    "customers": {},
    "stays": {
      "status": [
        "booked",
        "in_house",
        "departed",
        "cancelled",
        "no_show"
      ],
      "channel": [
        "online",
        "desk"
      ],
      "cancel_code": [
        "self",
        "guest_asked",
        "house"
      ]
    },
    "stay_extras": {
      "state": [
        "on",
        "off"
      ],
      "per": [
        "person_night",
        "night",
        "stay"
      ]
    },
    "charges": {},
    "stay_credits": {
      "reason": [
        "left_early",
        "missed"
      ]
    },
    "payments": {
      "kind": [
        "taken",
        "given_back"
      ],
      "method": [
        "card",
        "cash",
        "transfer"
      ]
    },
    "messages": {
      "kind": [
        "stay-made",
        "stay-made-desk",
        "stay-cancelled-self",
        "stay-cancelled-self-late",
        "stay-cancelled-desk",
        "stay-cancelled-desk-late",
        "stay-cancelled-house",
        "stay-no-show",
        "stay-dates-changed",
        "stay-new-link"
      ],
      "status": [
        "queued",
        "sent",
        "failed",
        "skipped"
      ],
      "skip_reason": [
        "overtaken",
        "paid",
        "void",
        "no-longer-needed",
        "by-hand"
      ]
    }
  },
  "capacity": {
    "stays": [
      {
        "kind": "night",
        "from": "arrive",
        "to": "depart",
        "countWhere": {
          "column": "status",
          "values": [
            "booked",
            "in_house"
          ]
        },
        "pool": {
          "via": "room_type_id",
          "count": {
            "table": "rooms",
            "column": "room_type_id",
            "outOfService": {
              "table": "room_closures",
              "room": "room_id",
              "from": "from_date",
              "to": "to_date",
              "active": "active"
            }
          },
          "fits": {
            "column": "sleeps"
          },
          "given": {
            "via": "room_id",
            "column": "room_type_id"
          }
        },
        "nights": {
          "min": 1,
          "max": {
            "table": "settings",
            "column": "max_nights"
          },
          "minByArrival": {
            "sat": 2
          },
          "aheadDays": {
            "table": "settings",
            "column": "ahead_days"
          }
        },
        "arrived": {
          "states": [
            "in_house"
          ]
        }
      },
      {
        "kind": "night",
        "from": "arrive",
        "to": "depart",
        "countWhere": {
          "column": "status",
          "values": [
            "booked",
            "in_house"
          ]
        },
        "pool": {
          "via": "room_id",
          "size": 1,
          "outOfService": {
            "table": "room_closures",
            "room": "room_id",
            "from": "from_date",
            "to": "to_date",
            "active": "active"
          }
        },
        "arrived": {
          "states": [
            "in_house"
          ]
        }
      }
    ],
    "stay_extras": {
      "kind": "night",
      "from": {
        "via": "stay_id",
        "column": "arrive"
      },
      "to": {
        "via": "stay_id",
        "column": "depart"
      },
      "countWhere": [
        {
          "column": "state",
          "values": [
            "on"
          ]
        },
        {
          "column": "status",
          "values": [
            "booked",
            "in_house"
          ],
          "via": "stay_id"
        }
      ],
      "pool": {
        "via": "extra_id",
        "size": {
          "column": "spaces"
        }
      },
      "arrived": {
        "states": [
          "in_house"
        ],
        "via": "stay_id"
      }
    }
  },
  "states": {
    "rooms": {
      "column": "status",
      "initial": "ready",
      "moves": {
        "ready": [
          "cleaning",
          {
            "to": "occupied",
            "roles": [
              "manager"
            ]
          }
        ],
        "cleaning": [
          "ready"
        ],
        "occupied": [
          {
            "to": "cleaning",
            "roles": [
              "manager"
            ]
          }
        ]
      }
    },
    "stays": {
      "column": "status",
      "initial": "booked",
      "strict": true,
      "moves": {
        "booked": [
          {
            "to": "in_house",
            "requires": {
              "where": [
                {
                  "column": "room_id",
                  "isNull": false
                }
              ],
              "linked": [
                {
                  "via": "room_id",
                  "where": [
                    {
                      "column": "status",
                      "eq": "ready"
                    }
                  ]
                }
              ],
              "time": {
                "after": {
                  "column": "arrive",
                  "time": "00:00"
                }
              }
            }
          },
          {
            "to": "cancelled",
            "requires": {
              "where": [
                {
                  "column": "cancel_code",
                  "isNull": false
                }
              ]
            }
          },
          {
            "to": "no_show",
            "requires": {
              "time": {
                "after": {
                  "column": "arrive",
                  "time": {
                    "column": "arrival_time"
                  },
                  "or": [
                    {
                      "column": "arrive",
                      "time": {
                        "table": "settings",
                        "column": "arrive_from"
                      }
                    }
                  ]
                }
              }
            }
          }
        ],
        "in_house": [
          {
            "to": "departed",
            "requires": {
              "where": [
                {
                  "column": "balance",
                  "lte": 0
                }
              ]
            }
          },
          {
            "to": "booked",
            "roles": [
              "manager"
            ]
          }
        ],
        "no_show": [
          {
            "to": "booked",
            "undo": true,
            "requires": {
              "time": {
                "before": {
                  "column": "depart",
                  "time": {
                    "table": "settings",
                    "column": "leave_by"
                  }
                }
              }
            }
          },
          {
            "to": "in_house",
            "requires": {
              "where": [
                {
                  "column": "room_id",
                  "isNull": false
                }
              ],
              "linked": [
                {
                  "via": "room_id",
                  "where": [
                    {
                      "column": "status",
                      "eq": "ready"
                    }
                  ]
                }
              ],
              "time": {
                "before": {
                  "column": "depart",
                  "time": {
                    "table": "settings",
                    "column": "leave_by"
                  }
                }
              }
            }
          }
        ]
      },
      "lock": {
        "when": [
          "departed",
          "cancelled"
        ],
        "except": [
          "link_stopped",
          "language"
        ]
      },
      "children": {
        "stay_extras": {
          "via": "stay_id",
          "parentIn": [
            "booked",
            "in_house"
          ]
        },
        "charges": {
          "via": "stay_id",
          "createIn": [
            "booked",
            "in_house"
          ],
          "changeIn": [
            "booked",
            "in_house",
            "departed",
            "cancelled",
            "no_show"
          ]
        },
        "stay_credits": {
          "via": "stay_id",
          "createIn": [
            "in_house",
            "no_show"
          ],
          "changeIn": [
            "booked",
            "in_house",
            "departed",
            "cancelled",
            "no_show"
          ]
        }
      },
      "late": [
        {
          "to": "cancelled",
          "from": [
            "booked"
          ],
          "moment": {
            "column": "cancel_by"
          },
          "within": {
            "minutes": 0
          },
          "mode": "flag",
          "flag": "late_cancel"
        }
      ],
      "timed": [
        {
          "from": "booked",
          "to": "no_show",
          "at": {
            "column": "expect_by",
            "time": {
              "table": "settings",
              "column": "no_show_at"
            },
            "plus": {
              "days": 1
            },
            "or": [
              {
                "column": "arrive",
                "time": {
                  "table": "settings",
                  "column": "no_show_at"
                },
                "plus": {
                  "days": 1
                }
              }
            ]
          }
        }
      ],
      "effects": [
        {
          "on": {
            "to": "in_house"
          },
          "via": "room_id",
          "set": {
            "status": "occupied"
          }
        },
        {
          "on": {
            "to": "departed"
          },
          "via": "room_id",
          "set": {
            "status": "cleaning"
          }
        },
        {
          "on": {
            "change": "room_id",
            "in": [
              "in_house"
            ]
          },
          "old": {
            "set": {
              "status": "cleaning"
            }
          },
          "new": {
            "set": {
              "status": "occupied"
            }
          }
        }
      ]
    }
  },
  "publicAccess": [
    {
      "table": "customers",
      "methods": [
        "GET",
        "PATCH"
      ],
      "select": [
        "first_name",
        "last_name",
        "email"
      ],
      "writable": [
        "first_name",
        "last_name"
      ],
      "claim": {
        "verify": "email-link",
        "email": "email"
      },
      "humanCheck": true,
      "forget": {
        "columns": [
          "email",
          "first_name",
          "last_name"
        ],
        "stamp": "forgotten_at",
        "links": true
      }
    },
    {
      "table": "stays",
      "methods": [
        "GET",
        "PATCH"
      ],
      "level": "verified",
      "claimedBy": {
        "table": "customers",
        "column": "customer_id"
      },
      "select": [
        "id",
        "ref",
        "status",
        "room_type_id",
        "room_id",
        "arrive",
        "depart",
        "guests",
        "nights",
        "first_name",
        "last_name",
        "email",
        "mobile",
        "arrival_time",
        "note",
        "language",
        "room_total",
        "extras_total",
        "charges_total",
        "credits_total",
        "subtotal",
        "tax_rate",
        "tax_label",
        "tax",
        "total",
        "paid",
        "balance",
        "cancel_by",
        "created_at",
        "checked_in_at",
        "checked_out_at",
        "cancelled_at",
        "no_show_marked_at"
      ],
      "writable": [
        "arrival_time",
        "status"
      ],
      "writableValues": {
        "status": [
          "cancelled"
        ],
        "arrival_time": [
          "15:00",
          "16:00",
          "17:00",
          "18:00",
          "19:00",
          "20:00",
          "21:00",
          "22:00",
          "22:30"
        ]
      },
      "writableWhen": {
        "status": [
          "booked"
        ],
        "arrive": {
          "before": {
            "time": {
              "table": "settings",
              "column": "arrive_from"
            }
          }
        }
      },
      "defaults": {
        "cancel_code": "self"
      },
      "newLink": {
        "column": "link_token",
        "kind": "stay-new-link"
      }
    },
    {
      "table": "stays",
      "methods": [
        "PATCH"
      ],
      "level": "verified",
      "claimedBy": {
        "table": "customers",
        "column": "customer_id"
      },
      "select": [
        "id",
        "ref",
        "status",
        "room_type_id",
        "room_id",
        "arrive",
        "depart",
        "guests",
        "nights",
        "first_name",
        "last_name",
        "email",
        "mobile",
        "arrival_time",
        "note",
        "language",
        "room_total",
        "extras_total",
        "charges_total",
        "credits_total",
        "subtotal",
        "tax_rate",
        "tax_label",
        "tax",
        "total",
        "paid",
        "balance",
        "cancel_by",
        "created_at",
        "checked_in_at",
        "checked_out_at",
        "cancelled_at",
        "no_show_marked_at"
      ],
      "writable": [
        "arrive",
        "depart"
      ],
      "writableWhen": {
        "status": [
          "booked"
        ],
        "cancel_by": {
          "before": {}
        }
      },
      "dryRun": true,
      "expect": "total"
    },
    {
      "table": "stay_extras",
      "methods": [
        "GET",
        "POST"
      ],
      "level": "verified",
      "visibleWith": {
        "table": "stays",
        "via": "stay_id"
      },
      "select": [
        "id",
        "stay_id",
        "extra_id",
        "state",
        "label",
        "each",
        "per",
        "nights",
        "guests",
        "amount"
      ],
      "writable": [
        "stay_id",
        "extra_id"
      ],
      "writableWhen": {
        "stay_id": {
          "before": {
            "column": "arrive",
            "time": {
              "table": "settings",
              "column": "arrive_from"
            }
          }
        }
      }
    },
    {
      "table": "stay_extras",
      "methods": [
        "PATCH"
      ],
      "level": "verified",
      "visibleWith": {
        "table": "stays",
        "via": "stay_id"
      },
      "select": [
        "id",
        "stay_id",
        "extra_id",
        "state",
        "label",
        "each",
        "per",
        "nights",
        "guests",
        "amount"
      ],
      "writable": [
        "state"
      ],
      "writableValues": {
        "state": [
          "on",
          "off"
        ]
      },
      "writableWhen": {
        "stay_id": {
          "before": {
            "column": "arrive",
            "time": {
              "table": "settings",
              "column": "arrive_from"
            }
          }
        }
      }
    },
    {
      "table": "charges",
      "methods": [
        "GET"
      ],
      "level": "verified",
      "visibleWith": {
        "table": "stays",
        "via": "stay_id"
      },
      "select": [
        "id",
        "stay_id",
        "label",
        "amount",
        "note",
        "charged_on",
        "voided"
      ]
    },
    {
      "table": "stay_credits",
      "methods": [
        "GET"
      ],
      "level": "verified",
      "visibleWith": {
        "table": "stays",
        "via": "stay_id"
      },
      "select": [
        "id",
        "stay_id",
        "reason",
        "from_date",
        "to_date",
        "nights",
        "amount",
        "voided"
      ]
    },
    {
      "table": "payments",
      "methods": [
        "GET"
      ],
      "level": "verified",
      "visibleWith": {
        "table": "stays",
        "via": "stay_id"
      },
      "select": [
        "id",
        "stay_id",
        "kind",
        "amount",
        "method",
        "paid_on",
        "voided"
      ]
    },
    {
      "table": "room_types",
      "methods": [
        "GET"
      ],
      "select": [
        "id",
        "code",
        "name",
        "blurb",
        "description",
        "sleeps",
        "base_rate",
        "color",
        "icon",
        "position"
      ],
      "filters": [
        {
          "column": "active",
          "op": "eq",
          "value": true
        }
      ]
    },
    {
      "table": "room_type_features",
      "methods": [
        "GET"
      ],
      "select": [
        "id",
        "room_type_id",
        "feature",
        "icon",
        "position"
      ]
    },
    {
      "table": "rooms",
      "methods": [
        "GET"
      ],
      "select": [
        "id",
        "number",
        "floor",
        "room_type_id"
      ]
    },
    {
      "table": "extras",
      "methods": [
        "GET"
      ],
      "select": [
        "id",
        "code",
        "label",
        "short",
        "how",
        "icon",
        "amount",
        "per",
        "spaces",
        "position"
      ],
      "filters": [
        {
          "column": "active",
          "op": "eq",
          "value": true
        }
      ]
    },
    {
      "table": "settings",
      "methods": [
        "GET"
      ],
      "select": [
        "name",
        "address",
        "town",
        "phone",
        "email",
        "since",
        "about",
        "finding",
        "morning",
        "directions_train",
        "directions_car",
        "directions_foot",
        "breakfast_hours",
        "late_arrival_note",
        "tax_rate",
        "tax_label",
        "arrive_from",
        "leave_by",
        "late_until",
        "cancel_days",
        "max_nights",
        "ahead_days",
        "guest_emails_on"
      ]
    },
    {
      "table": "house_notes",
      "methods": [
        "GET"
      ],
      "select": [
        "id",
        "icon",
        "text",
        "position"
      ]
    },
    {
      "table": "stays",
      "kind": "availability",
      "methods": [
        "GET"
      ],
      "showLeft": {
        "below": 5
      }
    },
    {
      "table": "stay_extras",
      "kind": "availability",
      "methods": [
        "GET"
      ],
      "showLeft": {
        "below": 3
      }
    },
    {
      "table": "stays",
      "methods": [
        "POST"
      ],
      "humanCheck": true,
      "level": "verified",
      "select": [
        "id",
        "ref",
        "status",
        "room_type_id",
        "room_id",
        "arrive",
        "depart",
        "guests",
        "nights",
        "arrival_time",
        "language",
        "room_total",
        "extras_total",
        "charges_total",
        "credits_total",
        "subtotal",
        "tax_rate",
        "tax_label",
        "tax",
        "total",
        "paid",
        "balance",
        "cancel_by",
        "created_at",
        "checked_in_at",
        "checked_out_at",
        "cancelled_at",
        "no_show_marked_at"
      ],
      "writable": [
        "room_type_id",
        "arrive",
        "depart",
        "guests",
        "first_name",
        "last_name",
        "email",
        "mobile",
        "arrival_time",
        "note",
        "language",
        "client_key"
      ],
      "requires": [
        "first_name",
        "last_name",
        "email"
      ],
      "claimedBy": {
        "table": "customers",
        "column": "customer_id",
        "optional": true
      },
      "identity": {
        "table": "customers",
        "email": "email",
        "link": "customer_id",
        "fill": {
          "first_name": "first_name",
          "last_name": "last_name"
        }
      },
      "shareLink": "link_token",
      "agrees": [
        {
          "column": "guests",
          "lte": {
            "via": "room_type_id",
            "column": "sleeps"
          }
        },
        {
          "column": "guests",
          "lte": {
            "via": "room_id",
            "column": "sleeps"
          }
        }
      ],
      "anonymous": {
        "perValue": {
          "columns": [
            "email"
          ],
          "n": 10
        },
        "perKeyHour": 300,
        "perIpHour": 10,
        "plainText": [
          "first_name",
          "last_name",
          "note",
          "mobile"
        ]
      },
      "children": {
        "stay_extras": {
          "via": "stay_id",
          "writable": [
            "extra_id"
          ],
          "select": [
            "id",
            "extra_id",
            "state",
            "label",
            "each",
            "per",
            "nights",
            "guests",
            "amount"
          ],
          "max": 8
        }
      },
      "dryRun": true,
      "expect": "total",
      "clientKey": "client_key"
    },
    {
      "table": "stays",
      "key": "link",
      "methods": [
        "GET",
        "PATCH"
      ],
      "select": [
        "id",
        "ref",
        "status",
        "room_type_id",
        "room_id",
        "arrive",
        "depart",
        "guests",
        "nights",
        "first_name",
        "last_name",
        "email",
        "mobile",
        "arrival_time",
        "note",
        "language",
        "room_total",
        "extras_total",
        "charges_total",
        "credits_total",
        "subtotal",
        "tax_rate",
        "tax_label",
        "tax",
        "total",
        "paid",
        "balance",
        "cancel_by",
        "created_at",
        "checked_in_at",
        "checked_out_at",
        "cancelled_at",
        "no_show_marked_at"
      ],
      "claim": {
        "by": "token",
        "column": "link_token",
        "stopped": "link_stopped",
        "own": true,
        "address": "email"
      },
      "writable": [
        "arrival_time",
        "status"
      ],
      "writableValues": {
        "status": [
          "cancelled"
        ],
        "arrival_time": [
          "15:00",
          "16:00",
          "17:00",
          "18:00",
          "19:00",
          "20:00",
          "21:00",
          "22:00",
          "22:30"
        ]
      },
      "writableWhen": {
        "status": [
          "booked"
        ],
        "arrive": {
          "before": {
            "time": {
              "table": "settings",
              "column": "arrive_from"
            }
          }
        }
      },
      "defaults": {
        "cancel_code": "self"
      }
    },
    {
      "table": "stay_extras",
      "key": "link",
      "methods": [
        "GET",
        "POST"
      ],
      "level": "verified",
      "visibleWith": {
        "table": "stays",
        "via": "stay_id"
      },
      "select": [
        "id",
        "stay_id",
        "extra_id",
        "state",
        "label",
        "each",
        "per",
        "nights",
        "guests",
        "amount"
      ],
      "writable": [
        "stay_id",
        "extra_id"
      ],
      "writableWhen": {
        "stay_id": {
          "before": {
            "column": "arrive",
            "time": {
              "table": "settings",
              "column": "arrive_from"
            }
          }
        }
      }
    },
    {
      "table": "stay_extras",
      "key": "link",
      "methods": [
        "PATCH"
      ],
      "level": "verified",
      "visibleWith": {
        "table": "stays",
        "via": "stay_id"
      },
      "select": [
        "id",
        "stay_id",
        "extra_id",
        "state",
        "label",
        "each",
        "per",
        "nights",
        "guests",
        "amount"
      ],
      "writable": [
        "state"
      ],
      "writableValues": {
        "state": [
          "on",
          "off"
        ]
      },
      "writableWhen": {
        "stay_id": {
          "before": {
            "column": "arrive",
            "time": {
              "table": "settings",
              "column": "arrive_from"
            }
          }
        }
      }
    },
    {
      "table": "charges",
      "key": "link",
      "methods": [
        "GET"
      ],
      "level": "verified",
      "visibleWith": {
        "table": "stays",
        "via": "stay_id"
      },
      "select": [
        "id",
        "stay_id",
        "label",
        "amount",
        "note",
        "charged_on",
        "voided"
      ]
    },
    {
      "table": "stay_credits",
      "key": "link",
      "methods": [
        "GET"
      ],
      "level": "verified",
      "visibleWith": {
        "table": "stays",
        "via": "stay_id"
      },
      "select": [
        "id",
        "stay_id",
        "reason",
        "from_date",
        "to_date",
        "nights",
        "amount",
        "voided"
      ]
    },
    {
      "table": "payments",
      "key": "link",
      "methods": [
        "GET"
      ],
      "level": "verified",
      "visibleWith": {
        "table": "stays",
        "via": "stay_id"
      },
      "select": [
        "id",
        "stay_id",
        "kind",
        "amount",
        "method",
        "paid_on",
        "voided"
      ]
    },
    {
      "table": "extras",
      "methods": [
        "GET"
      ],
      "select": [
        "id",
        "code",
        "label",
        "short",
        "how",
        "icon",
        "amount",
        "per",
        "spaces",
        "position"
      ],
      "filters": [
        {
          "column": "active",
          "op": "eq",
          "value": true
        }
      ],
      "key": "link"
    }
  ],
  "roles": [
    {
      "key": "front-desk",
      "grants": {
        "settings": [
          "read"
        ],
        "house_notes": [
          "read"
        ],
        "room_types": [
          "read"
        ],
        "room_type_features": [
          "read"
        ],
        "rooms": [
          "read",
          "update"
        ],
        "room_closures": [
          "read",
          "create",
          "update"
        ],
        "rate_rules": [
          "read"
        ],
        "extras": [
          "read"
        ],
        "charge_items": [
          "read"
        ],
        "customers": [
          "read",
          "read_pii"
        ],
        "stays": [
          "read",
          "read_pii",
          "create",
          "update"
        ],
        "stay_extras": [
          "read",
          "create",
          "update"
        ],
        "charges": [
          "read",
          "create"
        ],
        "stay_credits": [
          "read",
          "create"
        ],
        "payments": [
          "read",
          "create"
        ]
      },
      "limits": {
        "stays": {
          "writable": [
            "status",
            "room_type_id",
            "room_id",
            "arrive",
            "depart",
            "guests",
            "first_name",
            "last_name",
            "email",
            "mobile",
            "arrival_time",
            "note",
            "expect_by",
            "language",
            "cancel_code",
            "customer_id"
          ],
          "writableValues": {
            "status": [
              "booked",
              "in_house",
              "departed",
              "cancelled",
              "no_show"
            ],
            "cancel_code": [
              "guest_asked",
              "house"
            ]
          }
        },
        "stay_extras": {
          "writable": [
            "state"
          ]
        },
        "rooms": {
          "writable": [
            "status",
            "note"
          ],
          "writableValues": {
            "status": [
              "ready",
              "cleaning"
            ]
          }
        },
        "room_closures": {
          "writable": [
            "to_date",
            "reason",
            "active"
          ]
        }
      }
    },
    {
      "key": "housekeeping",
      "grants": {
        "rooms": [
          "read",
          "update"
        ],
        "room_types": [
          "read"
        ],
        "room_closures": [
          "read"
        ],
        "extras": [
          "read"
        ],
        "stays": [
          "read"
        ],
        "stay_extras": [
          "read"
        ]
      },
      "limits": {
        "rooms": {
          "writable": [
            "status"
          ],
          "writableValues": {
            "status": [
              "ready",
              "cleaning"
            ]
          }
        },
        "stays": {
          "readable": [
            "room_id",
            "arrive",
            "depart",
            "status"
          ]
        },
        "stay_extras": {
          "readable": [
            "stay_id",
            "extra_id",
            "state"
          ]
        }
      }
    },
    {
      "key": "manager",
      "grants": {
        "settings": [
          "read",
          "create",
          "update",
          "delete"
        ],
        "house_notes": [
          "read",
          "create",
          "update",
          "delete"
        ],
        "room_types": [
          "read",
          "create",
          "update",
          "delete"
        ],
        "room_type_features": [
          "read",
          "create",
          "update",
          "delete"
        ],
        "rooms": [
          "read",
          "create",
          "update",
          "delete"
        ],
        "room_closures": [
          "read",
          "create",
          "update",
          "delete"
        ],
        "rate_rules": [
          "read",
          "create",
          "update",
          "delete"
        ],
        "extras": [
          "read",
          "create",
          "update",
          "delete"
        ],
        "charge_items": [
          "read",
          "create",
          "update",
          "delete"
        ],
        "customers": [
          "read",
          "create",
          "update",
          "delete",
          "read_pii"
        ],
        "stays": [
          "read",
          "create",
          "update",
          "delete",
          "read_pii"
        ],
        "stay_extras": [
          "read",
          "create",
          "update",
          "delete"
        ],
        "charges": [
          "read",
          "create",
          "update",
          "delete"
        ],
        "stay_credits": [
          "read",
          "create",
          "update",
          "delete"
        ],
        "payments": [
          "read",
          "create",
          "update",
          "delete"
        ],
        "messages": [
          "read",
          "create",
          "update",
          "read_pii"
        ]
      },
      "limits": null
    }
  ],
  "producers": [
    {
      "kind": "stay-made",
      "link": "stay_id",
      "gate": {
        "setting": {
          "table": "settings",
          "column": "guest_emails_on"
        }
      },
      "onCreate": {
        "table": "stays",
        "where": {
          "column": "channel",
          "eq": "online"
        }
      }
    },
    {
      "kind": "stay-made-desk",
      "link": "stay_id",
      "gate": {
        "setting": {
          "table": "settings",
          "column": "guest_emails_on"
        }
      },
      "onCreate": {
        "table": "stays",
        "where": {
          "column": "channel",
          "eq": "desk"
        }
      }
    },
    {
      "kind": "stay-cancelled-self",
      "link": "stay_id",
      "gate": {
        "setting": {
          "table": "settings",
          "column": "guest_emails_on"
        }
      },
      "onChange": {
        "table": "stays",
        "column": "cancel_code",
        "to": "self",
        "where": {
          "column": "late_cancel",
          "eq": false
        }
      }
    },
    {
      "kind": "stay-cancelled-self-late",
      "link": "stay_id",
      "gate": {
        "setting": {
          "table": "settings",
          "column": "guest_emails_on"
        }
      },
      "onChange": {
        "table": "stays",
        "column": "cancel_code",
        "to": "self",
        "where": {
          "column": "late_cancel",
          "eq": true
        }
      }
    },
    {
      "kind": "stay-cancelled-desk",
      "link": "stay_id",
      "gate": {
        "setting": {
          "table": "settings",
          "column": "guest_emails_on"
        }
      },
      "onChange": {
        "table": "stays",
        "column": "cancel_code",
        "to": "guest_asked",
        "where": {
          "column": "late_cancel",
          "eq": false
        }
      }
    },
    {
      "kind": "stay-cancelled-desk-late",
      "link": "stay_id",
      "gate": {
        "setting": {
          "table": "settings",
          "column": "guest_emails_on"
        }
      },
      "onChange": {
        "table": "stays",
        "column": "cancel_code",
        "to": "guest_asked",
        "where": {
          "column": "late_cancel",
          "eq": true
        }
      }
    },
    {
      "kind": "stay-cancelled-house",
      "link": "stay_id",
      "gate": {
        "setting": {
          "table": "settings",
          "column": "guest_emails_on"
        }
      },
      "onChange": {
        "table": "stays",
        "column": "cancel_code",
        "to": "house"
      }
    },
    {
      "kind": "stay-no-show",
      "link": "stay_id",
      "gate": {
        "setting": {
          "table": "settings",
          "column": "guest_emails_on"
        }
      },
      "onChange": {
        "table": "stays",
        "column": "status",
        "to": "no_show"
      }
    },
    {
      "kind": "stay-dates-changed",
      "link": "stay_id",
      "gate": {
        "setting": {
          "table": "settings",
          "column": "guest_emails_on"
        }
      },
      "onChange": {
        "table": "stays",
        "columns": [
          "arrive",
          "depart"
        ],
        "changed": true,
        "where": {
          "column": "status",
          "eq": "booked"
        }
      },
      "repeat": true,
      "was": [
        "arrive",
        "depart",
        "total"
      ]
    }
  ],
  "kinds": {
    "stay-made": "hotel-stay-made",
    "stay-made-desk": "hotel-stay-made-desk",
    "stay-cancelled-self": "hotel-stay-cancelled-self",
    "stay-cancelled-self-late": "hotel-stay-cancelled-self-late",
    "stay-cancelled-desk": "hotel-stay-cancelled-desk",
    "stay-cancelled-desk-late": "hotel-stay-cancelled-desk-late",
    "stay-cancelled-house": "hotel-stay-cancelled-house",
    "stay-no-show": "hotel-stay-no-show",
    "stay-dates-changed": "hotel-stay-dates-changed",
    "stay-new-link": "hotel-stay-new-link"
  }
} as const;
