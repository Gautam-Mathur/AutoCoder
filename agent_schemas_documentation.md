# RuFlo Agent Schemas Documentation

This file contains the canonical JSON schemas for all RuFlo agents extracted directly from the registry files in `src/lib/agents/ruflo/registry/`.

# RuFlo Agent Schemas

## Architect
```json
{
  type: 'object',
  properties: {
    architectureStyle: { type: 'string' },
    modules: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          purpose: { type: 'string' },
          supportsFeatures: { type: 'array', items: { type: 'string' } },
          dependsOn: { type: 'array', items: { type: 'string' } },
          ownedDirectories: { type: 'array', items: { type: 'string' } },
          ownedFiles: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    projectStructure: {
      type: 'object',
      properties: {
        root: { type: 'string' },
        directories: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              path: { type: 'string' },
              moduleId: { type: 'string' }
            }
          }
        },
        files: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              path: { type: 'string' },
              moduleId: { type: 'string' },
              module: { type: 'string' },
              purpose: { type: 'string' },
              type: { type: 'string' }
            }
          }
        }
      }
    },
    sharedResources: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          type: { type: 'string' },
          purpose: { type: 'string' },
          usedByModules: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    moduleDependencies: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          moduleId: { type: 'string' },
          dependsOn: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    projectConventions: {
      type: 'object',
      properties: {
        namingConvention: { type: 'string' },
        folderConvention: { type: 'string' },
        importConvention: { type: 'string' },
        codeOrganization: { type: 'string' }
      }
    },
    metadata: {
      type: 'object',
      properties: {
        version: { type: 'string' },
        generatedAt: { type: 'string' },
        status: { type: 'string', enum: ['COMPLETE', 'PARTIAL', 'ERROR'] }
      }
    }
  },
  required: ['architectureStyle', 'modules', 'projectStructure', 'projectConventions']
}
```

## Blueprinter
```json
{
  type: 'object',
  properties: {
    reasoning: {
      type: 'string',
      description: 'Topological dependency and contract planning rationale'
    },
    blueprints: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Relative target file path' },
          compileOrder: { type: 'number', description: 'Topological compile order index (1 = dependencies first, higher = dependent UI/entrypoints)' },
          exports: { type: 'array', items: { type: 'string' }, description: 'Exact exported symbols (types, functions, classes)' },
          imports: { type: 'array', items: { type: 'string' }, description: 'Required relative or package imports' }
        },
        required: ['file', 'compileOrder', 'exports', 'imports']
      }
    }
  },
  required: ['reasoning', 'blueprints']
}
```

## Coder
```json
{

  type: 'object',
  properties: {
    file: { type: 'string' },
    code: { type: 'string' }
  },
  required: ['file', 'code']
}
```

## Debugger
```json
{
  type: 'object',
  properties: {
    summary: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['RESOLVED', 'PARTIALLY_RESOLVED', 'FAILED'] },
        resolvedDefects: { type: 'number' },
        remainingDefects: { type: 'number' },
        modifiedFiles: { type: 'number' }
      }
    },
    fixes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          defectId: { type: 'string' },
          status: { type: 'string', enum: ['RESOLVED', 'PARTIALLY_RESOLVED', 'FAILED'] },
          rootCause: { type: 'string' },
          resolution: { type: 'string' },
          modifiedFiles: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                path: { type: 'string' },
                changes: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string', enum: ['ADD', 'MODIFY', 'DELETE'] },
                      description: { type: 'string' }
                    }
                  }
                }
              }
            }
          },
          regressionRisk: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] }
        }
      }
    },
    generatedFiles: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          language: { type: 'string' },
          code: { type: 'string' }
        }
      }
    },
    validation: {
      type: 'object',
      properties: {
        resolvedDefectIds: { type: 'array', items: { type: 'string' } },
        remainingDefectIds: { type: 'array', items: { type: 'string' } },
        warnings: { type: 'array', items: { type: 'string' } },
        notes: { type: 'array', items: { type: 'string' } }
      }
    },
    metadata: {
      type: 'object',
      properties: {
        version: { type: 'string' },
        generatedAt: { type: 'string' },
        status: { type: 'string', enum: ['COMPLETE', 'PARTIAL', 'ERROR'] }
      }
    }
  },
  required: ['summary', 'fixes']
}
```

## Designer
```json
{
  type: 'object',
  properties: {
    designSystem: {
      type: 'object',
      properties: {
        designStyle: { type: 'string' },
        theme: { type: 'string' },
        colorPalette: { type: 'array', items: { type: 'string' } },
        typography: { type: 'array', items: { type: 'string' } },
        spacing: { type: 'string' },
        iconography: { type: 'string' },
        responsiveStrategy: { type: 'string' }
      }
    },
    navigation: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        entryPoint: { type: 'string' },
        flows: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              steps: { type: 'array', items: { type: 'string' } }
            }
          }
        }
      }
    },
    pages: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          route: { type: 'string' },
          purpose: { type: 'string' },
          supportsFeatures: { type: 'array', items: { type: 'string' } },
          components: { type: 'array', items: { type: 'string' } },
          apiDependencies: { type: 'array', items: { type: 'string' } },
          entityDependencies: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    components: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          type: { type: 'string' },
          parentPageId: { type: 'string' },
          purpose: { type: 'string' },
          reusable: { type: 'boolean' },
          supportsFeatures: { type: 'array', items: { type: 'string' } },
          apiDependencies: { type: 'array', items: { type: 'string' } },
          entityDependencies: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    interactionDesign: {
      type: 'object',
      properties: {
        loadingStates: { type: 'array', items: { type: 'string' } },
        emptyStates: { type: 'array', items: { type: 'string' } },
        errorStates: { type: 'array', items: { type: 'string' } },
        successStates: { type: 'array', items: { type: 'string' } },
        feedbackPatterns: { type: 'array', items: { type: 'string' } },
        animations: { type: 'array', items: { type: 'string' } }
      }
    },
    accessibility: {
      type: 'object',
      properties: {
        keyboardNavigation: { type: 'boolean' },
        screenReaderSupport: { type: 'boolean' },
        responsive: { type: 'boolean' },
        additionalRequirements: { type: 'array', items: { type: 'string' } }
      }
    },
    metadata: {
      type: 'object',
      properties: {
        version: { type: 'string' },
        generatedAt: { type: 'string' },
        status: { type: 'string', enum: ['COMPLETE', 'PARTIAL', 'ERROR'] }
      }
    }
  },
  required: ['designSystem', 'pages', 'components', 'navigation']
}
```

## Planner
```json
{
  type: 'object',
  properties: {
    recommendedTechStack: {
      type: 'object',
      properties: {
        frontend: { type: 'string' },
        backend: { type: 'string' },
        database: { type: 'string' },
        authentication: { type: 'string' },
        deployment: { type: 'string' },
        additionalTechnologies: { type: 'array', items: { type: 'string' } }
      }
    },
    features: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          priority: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
          dependsOn: { type: 'array', items: { type: 'string' } },
          requirements: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    functionalRequirements: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          description: { type: 'string' },
          featureId: { type: 'string' }
        }
      }
    },
    nonFunctionalRequirements: {
      type: 'object',
      properties: {
        performance: { type: 'array', items: { type: 'string' } },
        security: { type: 'array', items: { type: 'string' } },
        scalability: { type: 'array', items: { type: 'string' } },
        reliability: { type: 'array', items: { type: 'string' } },
        maintainability: { type: 'array', items: { type: 'string' } },
        accessibility: { type: 'array', items: { type: 'string' } },
        usability: { type: 'array', items: { type: 'string' } }
      }
    },
    acceptanceCriteria: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          featureId: { type: 'string' },
          criteria: { type: 'string' }
        }
      }
    },
    metadata: {
      type: 'object',
      properties: {
        version: { type: 'string' },
        generatedAt: { type: 'string' },
        status: { type: 'string', enum: ['COMPLETE', 'PARTIAL', 'ERROR'] }
      }
    }
  },
  required: ['recommendedTechStack', 'features', 'functionalRequirements', 'nonFunctionalRequirements']
}
```

## Queen
```json
{
  type: 'object',
  properties: {
    projectName: { type: 'string' },
    problemStatement: { type: 'string' },
    projectDescription: { type: 'string' },
    projectGoal: { type: 'string' },
    mvpScope: {
      type: 'object',
      properties: {
        included: { type: 'array', items: { type: 'string' } },
        excluded: { type: 'array', items: { type: 'string' } }
      }
    },
    constraints: {
      type: 'object',
      properties: {
        technical: { type: 'array', items: { type: 'string' } },
        business: { type: 'array', items: { type: 'string' } },
        platform: { type: 'array', items: { type: 'string' } },
        legal: { type: 'array', items: { type: 'string' } },
        budget: { type: 'string' },
        timeline: { type: 'string' },
        other: { type: 'array', items: { type: 'string' } }
      }
    },
    assumptions: { type: 'array', items: { type: 'string' } },
    risks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] }
        }
      }
    },
    metadata: {
      type: 'object',
      properties: {
        version: { type: 'string' },
        generatedAt: { type: 'string' },
        status: { type: 'string', enum: ['COMPLETE', 'PARTIAL', 'ERROR'] }
      }
    }
  },
  required: ['projectName', 'problemStatement', 'projectDescription', 'projectGoal', 'mvpScope', 'constraints', 'assumptions', 'risks']
}
```

## Reviewer
```json
{
  type: 'object',
  properties: {
    summary: {
      type: 'object',
      properties: {
        overallAssessment: { type: 'string', enum: ['APPROVED', 'APPROVED_WITH_RECOMMENDATIONS', 'REQUIRES_REWORK', 'REJECTED'] },
        engineeringQuality: { type: 'string', enum: ['EXCELLENT', 'GOOD', 'FAIR', 'POOR'] },
        releaseReadiness: { type: 'string', enum: ['READY', 'READY_WITH_MINOR_IMPROVEMENTS', 'NOT_READY'] }
      }
    },
    requirementCoverage: {
      type: 'object',
      properties: {
        features: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              featureId: { type: 'string' },
              status: { type: 'string', enum: ['COMPLETE', 'PARTIAL', 'MISSING'] },
              notes: { type: 'string' }
            }
          }
        },
        functionalRequirements: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              requirementId: { type: 'string' },
              status: { type: 'string', enum: ['SATISFIED', 'PARTIAL', 'UNSATISFIED'] }
            }
          }
        }
      }
    },
    architectureReview: {
      type: 'object',
      properties: {
        structureConsistency: { type: 'string', enum: ['PASS', 'FAIL'] },
        moduleOrganization: { type: 'string', enum: ['PASS', 'FAIL'] },
        dependencyQuality: { type: 'string', enum: ['PASS', 'FAIL'] },
        projectOrganization: { type: 'string', enum: ['PASS', 'FAIL'] },
        notes: { type: 'array', items: { type: 'string' } }
      }
    },
    codeQuality: {
      type: 'object',
      properties: {
        readability: { type: 'string', enum: ['EXCELLENT', 'GOOD', 'FAIR', 'POOR'] },
        maintainability: { type: 'string', enum: ['EXCELLENT', 'GOOD', 'FAIR', 'POOR'] },
        modularity: { type: 'string', enum: ['EXCELLENT', 'GOOD', 'FAIR', 'POOR'] },
        consistency: { type: 'string', enum: ['EXCELLENT', 'GOOD', 'FAIR', 'POOR'] },
        notes: { type: 'array', items: { type: 'string' } }
      }
    },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          severity: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
          category: { type: 'string', enum: ['ARCHITECTURE', 'CODE_QUALITY', 'MAINTAINABILITY', 'CONSISTENCY', 'DOCUMENTATION', 'BEST_PRACTICE'] },
          title: { type: 'string' },
          description: { type: 'string' },
          affectedFiles: { type: 'array', items: { type: 'string' } },
          recommendation: { type: 'string' }
        }
      }
    },
    strengths: { type: 'array', items: { type: 'string' } },
    recommendations: { type: 'array', items: { type: 'string' } },
    metadata: {
      type: 'object',
      properties: {
        version: { type: 'string' },
        generatedAt: { type: 'string' },
        status: { type: 'string', enum: ['COMPLETE', 'PARTIAL', 'ERROR'] }
      }
    },
    qualityScore: { type: 'number' },
    annotations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          note: { type: 'string' },
          agent: { type: 'string' },
          severity: { type: 'string' }
        }
      }
    }
  },
  required: ['summary', 'findings']
}
```

## Security
```json
{
  type: 'object',
  properties: {
    summary: {
      type: 'object',
      properties: {
        overallSecurityStatus: { type: 'string', enum: ['SECURE', 'SECURE_WITH_WARNINGS', 'VULNERABLE', 'CRITICAL'] },
        securityScore: { type: 'number' },
        overallRisk: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] }
      }
    },
    securityRequirements: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          requirement: { type: 'string' },
          status: { type: 'string', enum: ['SATISFIED', 'PARTIAL', 'UNSATISFIED'] },
          notes: { type: 'string' }
        }
      }
    },
    securityChecks: {
      type: 'object',
      properties: {
        authentication: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['PASS', 'FAIL', 'NOT_APPLICABLE'] },
            findings: { type: 'array', items: { type: 'string' } }
          }
        },
        authorization: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['PASS', 'FAIL', 'NOT_APPLICABLE'] },
            findings: { type: 'array', items: { type: 'string' } }
          }
        },
        inputValidation: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['PASS', 'FAIL', 'NOT_APPLICABLE'] },
            findings: { type: 'array', items: { type: 'string' } }
          }
        },
        dataProtection: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['PASS', 'FAIL', 'NOT_APPLICABLE'] },
            findings: { type: 'array', items: { type: 'string' } }
          }
        },
        secretManagement: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['PASS', 'FAIL', 'NOT_APPLICABLE'] },
            findings: { type: 'array', items: { type: 'string' } }
          }
        },
        configuration: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['PASS', 'FAIL', 'NOT_APPLICABLE'] },
            findings: { type: 'array', items: { type: 'string' } }
          }
        },
        dependencySecurity: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['PASS', 'FAIL', 'NOT_APPLICABLE'] },
            findings: { type: 'array', items: { type: 'string' } }
          }
        },
        apiSecurity: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['PASS', 'FAIL', 'NOT_APPLICABLE'] },
            findings: { type: 'array', items: { type: 'string' } }
          }
        }
      }
    },
    vulnerabilities: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          severity: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'] },
          category: { type: 'string', enum: ['AUTHENTICATION', 'AUTHORIZATION', 'INPUT_VALIDATION', 'DATA_EXPOSURE', 'CONFIGURATION', 'DEPENDENCY', 'API', 'SECRET_MANAGEMENT', 'OTHER'] },
          affectedFiles: { type: 'array', items: { type: 'string' } },
          attackSurface: { type: 'string' },
          businessImpact: { type: 'string' },
          evidence: { type: 'string' },
          recommendation: { type: 'string' }
        }
      }
    },
    securityStrengths: { type: 'array', items: { type: 'string' } },
    recommendations: { type: 'array', items: { type: 'string' } },
    metadata: {
      type: 'object',
      properties: {
        version: { type: 'string' },
        generatedAt: { type: 'string' },
        status: { type: 'string', enum: ['COMPLETE', 'PARTIAL', 'ERROR'] }
      }
    }
  },
  required: ['summary', 'vulnerabilities']
}
```

## System
```json
{
  type: 'object',
  properties: {
    database: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        entities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              purpose: { type: 'string' },
              supportsFeatures: { type: 'array', items: { type: 'string' } },
              fields: { type: 'array', items: { type: 'string' } },
              relationships: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    entity: { type: 'string' },
                    type: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    },
    apis: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          route: { type: 'string' },
          method: { type: 'string' },
          request: {
            type: 'object',
            properties: {
              body: { type: 'array', items: { type: 'string' } },
              query: { type: 'array', items: { type: 'string' } },
              params: { type: 'array', items: { type: 'string' } }
            }
          },
          response: {
            type: 'object',
            properties: {
              success: { type: 'string' },
              error: { type: 'string' }
            }
          },
          authentication: { type: 'boolean' },
          authorization: { type: 'string' },
          supportsFeatures: { type: 'array', items: { type: 'string' } },
          serviceId: { type: 'string' }
        }
      }
    },
    services: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          responsibilities: { type: 'array', items: { type: 'string' } },
          supportsFeatures: { type: 'array', items: { type: 'string' } },
          consumedEntities: { type: 'array', items: { type: 'string' } },
          consumedApis: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    middleware: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          purpose: { type: 'string' },
          appliesTo: { type: 'array', items: { type: 'string' } },
          order: { type: 'number' }
        }
      }
    },
    configuration: {
      type: 'object',
      properties: {
        environmentVariables: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              required: { type: 'boolean' },
              purpose: { type: 'string' }
            }
          }
        },
        externalServices: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              purpose: { type: 'string' }
            }
          }
        }
      }
    },
    validationRules: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          target: { type: 'string' },
          rule: { type: 'string' },
          supportsFeature: { type: 'string' }
        }
      }
    },
    businessRules: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          description: { type: 'string' },
          supportsFeature: { type: 'string' }
        }
      }
    },
    metadata: {
      type: 'object',
      properties: {
        version: { type: 'string' },
        generatedAt: { type: 'string' },
        status: { type: 'string', enum: ['COMPLETE', 'PARTIAL', 'ERROR'] }
      }
    }
  },
  required: ['database', 'apis', 'services']
}
```

## Tester
```json
{
  type: 'object',
  properties: {
    summary: {
      type: 'object',
      properties: {
        overallStatus: { type: 'string', enum: ['PASSED', 'PASSED_WITH_WARNINGS', 'FAILED'] },
        totalTests: { type: 'number' },
        passedTests: { type: 'number' },
        failedTests: { type: 'number' },
        skippedTests: { type: 'number' }
      }
    },
    coverage: {
      type: 'object',
      properties: {
        features: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              featureId: { type: 'string' },
              status: { type: 'string', enum: ['PASSED', 'FAILED', 'PARTIAL'] },
              testedRequirements: { type: 'array', items: { type: 'string' } }
            }
          }
        },
        functionalRequirements: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              requirementId: { type: 'string' },
              status: { type: 'string', enum: ['PASSED', 'FAILED', 'PARTIAL'] }
            }
          }
        },
        nonFunctionalRequirements: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              category: { type: 'string' },
              status: { type: 'string', enum: ['PASSED', 'FAILED', 'NOT_APPLICABLE'] },
              notes: { type: 'string' }
            }
          }
        }
      }
    },
    testCases: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          type: { type: 'string', enum: ['UNIT', 'INTEGRATION', 'SYSTEM', 'E2E'] },
          relatedFeatureId: { type: 'string' },
          relatedRequirementIds: { type: 'array', items: { type: 'string' } },
          expectedResult: { type: 'string' },
          actualResult: { type: 'string' },
          status: { type: 'string', enum: ['PASSED', 'FAILED', 'SKIPPED'] },
          affectedFiles: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    defects: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          severity: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
          category: { type: 'string', enum: ['FUNCTIONAL', 'UI', 'API', 'DATABASE', 'SECURITY', 'PERFORMANCE', 'VALIDATION', 'INTEGRATION'] },
          relatedFeatureId: { type: 'string' },
          relatedRequirementIds: { type: 'array', items: { type: 'string' } },
          affectedFiles: { type: 'array', items: { type: 'string' } },
          expectedBehavior: { type: 'string' },
          actualBehavior: { type: 'string' },
          reproductionSteps: { type: 'array', items: { type: 'string' } },
          rootCauseHypothesis: { type: 'string' }
        }
      }
    },
    generatedTests: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          purpose: { type: 'string' }
        }
      }
    },
    metadata: {
      type: 'object',
      properties: {
        version: { type: 'string' },
        generatedAt: { type: 'string' },
        status: { type: 'string', enum: ['COMPLETE', 'PARTIAL', 'ERROR'] }
      }
    }
  },
  required: ['summary', 'defects']
}
```


